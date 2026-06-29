import React from "react";

const getAvatarColorClass = (key) => {
  const colors = [
    "avatar-color-0",
    "avatar-color-1",
    "avatar-color-2",
    "avatar-color-3",
    "avatar-color-4",
    "avatar-color-5",
  ];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

function Sidebar({ users, onlineUsers, currentUser, activeRoom, setActiveRoom, onLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">💬</div>
        <h1>ChatSphere</h1>
      </div>

      <div className="sidebar-section-title">Channels</div>
      <div
        className={`room-item ${activeRoom === "general" ? "active" : ""}`}
        onClick={() => setActiveRoom("general")}
      >
        <span className="room-hash">#</span>
        <span>general</span>
      </div>

      <div className="sidebar-section-title">Direct messages</div>
      <div className="users-list">
        {users.length === 0 && <p className="no-users">No other users yet</p>}
        {users.map((u) => {
          const isOnline = onlineUsers.includes(u._id);
          const colorClass = getAvatarColorClass(u.username);
          return (
            <div className="room-item" key={u._id}>
              <div className={`avatar ${colorClass}`}>
                {u.username.charAt(0).toUpperCase()}
                {isOnline && <span className="avatar-dot"></span>}
              </div>
              <span>{u.username}</span>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className={`avatar ${getAvatarColorClass(currentUser.username)}`}>
          {currentUser.username.charAt(0).toUpperCase()}
          <span className="avatar-dot"></span>
        </div>
        <div className="current-user-info">
          <h4>{currentUser.username}</h4>
          <span className="status-text-online">
            <span className="status-dot-small"></span>
            Online
          </span>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Logout">
          ⏻
        </button>
      </div>
    </div>
  );
}

export default Sidebar;