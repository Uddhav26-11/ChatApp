import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

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

function ProfileModal({ profileUser, onlineUsers, onClose, onStartChat }) {
  if (!profileUser) return null;

  const isOnline = onlineUsers.includes(profileUser._id);

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="profile-modal">
        {/* Close button */}
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        {/* Avatar large */}
        <div className={`profile-avatar-large ${getAvatarColorClass(profileUser.username)}`}>
          {profileUser.username.charAt(0).toUpperCase()}
          {isOnline && <span className="profile-online-ring" />}
        </div>

        {/* Info */}
        <h2 className="profile-username">{profileUser.username}</h2>
        <p className="profile-email">{profileUser.email}</p>

        <div className={`profile-status-badge ${isOnline ? "online" : "offline"}`}>
          <span className="profile-status-dot" />
          {isOnline ? "Online" : "Offline"}
        </div>

        {/* Joined date */}
        {profileUser.createdAt && (
          <p className="profile-joined">
            📅 Joined {new Date(profileUser.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}

        {/* Message button */}
        {onStartChat && (
          <button
            className="profile-message-btn"
            onClick={() => {
              onStartChat(profileUser);
              onClose();
            }}
          >
            💬 Send Message
          </button>
        )}
      </div>
    </>
  );
}

export default ProfileModal;