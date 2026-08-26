"use client";

/* 真结局后返回登录：登出主账号并跳转回游戏的登录页（Client Component） */
export function BackToLogin() {
  const go = () => {
    try {
      const raw = localStorage.getItem("echos-arg-v1");
      if (raw) {
        const s = JSON.parse(raw);
        s.loggedIn = false;
        localStorage.setItem("echos-arg-v1", JSON.stringify(s));
      }
    } catch {
      /* 忽略 */
    }
    // 相对上一级目录跳回游戏登录页（兼容 GitHub Pages 子路径、根域与本地预览）
    window.location.href = "../#/login";
  };
  return (
    <button
      onClick={go}
      style={{
        display: "block", margin: "40px auto 0", border: "1px solid #39444f",
        background: "transparent", color: "#aab4bf", borderRadius: 8, padding: "10px 22px",
        cursor: "pointer", fontSize: 13,
      }}
    >
      回到最开始登录界面 →
    </button>
  );
}
