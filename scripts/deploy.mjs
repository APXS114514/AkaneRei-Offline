#!/usr/bin/env node
/**
 * 一键部署脚本：构建静态站点 -> 提交全部改动 -> 推送到 origin/main。
 *
 * 用法：
 *   npm run deploy                 # 使用默认提交信息
 *   npm run deploy -- "消息内容"    # 自定义提交信息
 *
 * 说明：
 * - 会先执行 build:pages，构建失败则中止，不会提交。
 * - 如果没有未提交改动，会跳过 commit。
 * - 推送使用 origin/main；若需要自定义远程/分支，可手动改下方常量。
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const REMOTE = "origin";
const BRANCH = "main";
const DEFAULT_MESSAGE = "Deploy: update AkaneRei Offline";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(cmd, args, opts = {}) {
  // 仅 npm.cmd 需要走 shell；git 直接执行以避免提交信息被 shell 拆词
  const useShell = process.platform === "win32" && cmd === npmCmd;
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: useShell,
    ...opts,
  });
  if (result.error) {
    console.error(`\n[deploy] 执行失败：${cmd} ${args.join(" ")}`);
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\n[deploy] 命令退出码非 0：${cmd} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
  return result;
}

// 1. 先构建静态站点
console.log("\n[deploy] 1/4 构建静态站点（build:pages）...\n");
run(npmCmd, ["run", "build:pages"]);

// 2. 检查是否有改动
console.log("\n[deploy] 2/4 检查工作区改动...\n");
const status = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });
if (status.error) {
  console.error("[deploy] 无法读取 git 状态");
  process.exit(1);
}
const changes = status.stdout.trim();
if (!changes) {
  console.log("[deploy] 没有未提交改动，跳过 commit。");
} else {
  // 3. 提交全部改动
  console.log("[deploy] 3/4 添加并提交改动...\n");
  run("git", ["add", "-A"]);
  const message = process.argv[2]?.trim() || DEFAULT_MESSAGE;
  run("git", ["commit", "-m", message]);
}

// 4. 推送
console.log("\n[deploy] 4/4 推送到远程...\n");
run("git", ["push", REMOTE, BRANCH]);
console.log("\n[deploy] 完成 ✅");
