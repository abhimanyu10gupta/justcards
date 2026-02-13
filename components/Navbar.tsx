'use client'

export default function Navbar() {
  return (
    <nav className="nav">
      {/* Left */}
      <div className="left">
        <span className="logo">cardlol</span>
      </div>

      {/* Right */}
      <div className="right">
        <a href="/design" className="btn primary">
          Design your own
        </a>
        <a href="/login" className="btn ghost">
          Login
        </a>
      </div>

      <style jsx>{`
        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          pointer-events: none;
        }

        .left,
        .right {
          display: flex;
          align-items: center;
          gap: 14px;
          pointer-events: auto;
        }

        .logo {
          font-weight: 600;
          letter-spacing: -0.02em;
          font-size: 1.05rem;
          color: white;
          opacity: 0.9;
        }

        .btn {
          font-size: 0.9rem;
          padding: 8px 14px;
          border-radius: 999px;
          text-decoration: none;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn.primary {
          background: white;
          color: black;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
        }

        .btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
        }

        .btn.ghost {
          color: white;
          opacity: 0.75;
        }

        .btn.ghost:hover {
          opacity: 1;
        }

        @media (max-width: 640px) {
          .btn.ghost {
            display: none;
          }
        }
      `}</style>
    </nav>
  )
}
