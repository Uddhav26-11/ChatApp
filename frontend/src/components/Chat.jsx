import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth, API_URL } from "../context/AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";
import EmojiPicker from "emoji-picker-react";
import ProfileModal from "./ProfileModal.jsx";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

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

function Chat() {
  const { user, socket, logout } = useAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeRoom, setActiveRoom] = useState("general");
  const [selectedUser, setSelectedUser] = useState(null);
  const [typingUser, setTypingUser] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState(null);

  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionList, setMentionList] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);

  const [profileUser, setProfileUser] = useState(null);

  const [now, setNow] = useState(new Date());

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const authHeader = {
    headers: { Authorization: `Bearer ${user.token}` },
  };

  const roomId = selectedUser
    ? [user._id, selectedUser._id].sort().join("_")
    : activeRoom;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_URL}/auth/users`, authHeader);
        setUsers(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchAndJoin = async () => {
      try {
        let url;
        if (selectedUser) {
          if (socket) socket.emit("join-private-room", roomId);
          url = `${API_URL}/messages/private/${selectedUser._id}`;
        } else {
          if (socket) socket.emit("join-room", activeRoom);
          url = `${API_URL}/messages/${activeRoom}`;
        }
        const res = await axios.get(url, authHeader);
        setMessages(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchAndJoin();
  }, [activeRoom, selectedUser, socket]);

  useEffect(() => {
    if (!socket) return;

    const onGroupMsg = (message) => {
      if (message.room === activeRoom && !selectedUser) {
        setMessages((prev) => [...prev, message]);
        if (
          message.sender !== user._id &&
          message.text.toLowerCase().includes(`@${user.username.toLowerCase()}`)
        ) {
          toast(`🔔 ${message.senderName} ne tumhe mention kiya!`, {
            style: { background: "#5b5fef", color: "#fff", borderRadius: "10px" },
          });
        }
      }
    };

    const onPrivateMsg = (message) => {
      const msgRoomId = [
        typeof message.sender === "object" ? message.sender._id : message.sender,
        message.receiver,
      ]
        .sort()
        .join("_");
      if (selectedUser && msgRoomId === roomId) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const onReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        )
      );
    };

    socket.on("receive-message", onGroupMsg);
    socket.on("receive-private-message", onPrivateMsg);
    socket.on("reaction-updated", onReactionUpdated);
    socket.on("online-users", (list) => setOnlineUsers(list));
    socket.on("typing", (name) => setTypingUser(name));
    socket.on("typing-private", (name) => setTypingUser(name));
    socket.on("stop-typing", () => setTypingUser(""));
    socket.on("stop-typing-private", () => setTypingUser(""));

    return () => {
      socket.off("receive-message", onGroupMsg);
      socket.off("receive-private-message", onPrivateMsg);
      socket.off("reaction-updated", onReactionUpdated);
      socket.off("online-users");
      socket.off("typing");
      socket.off("typing-private");
      socket.off("stop-typing");
      socket.off("stop-typing-private");
    };
  }, [socket, activeRoom, selectedUser, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showMentions) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionList.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev === 0 ? mentionList.length - 1 : prev - 1
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (mentionList[mentionIndex]) {
          insertMention(mentionList[mentionIndex].username);
        }
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showMentions, mentionList, mentionIndex]);

  const handleTyping = (e) => {
    const val = e.target.value;
    setText(val);

    if (!socket) return;

    const cursorPos = e.target.selectionStart;
    const textUpToCursor = val.slice(0, cursorPos);
    const atMatch = textUpToCursor.match(/@(\w*)$/);

    if (atMatch && !selectedUser) {
      const query = atMatch[1].toLowerCase();
      setMentionQuery(query);
      const filtered = users.filter((u) =>
        u.username.toLowerCase().startsWith(query)
      );
      setMentionList(filtered);
      setShowMentions(filtered.length > 0);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }

    if (selectedUser) {
      socket.emit("typing-private", {
        sender: user._id,
        receiver: selectedUser._id,
        senderName: user.username,
      });
    } else {
      socket.emit("typing", { room: activeRoom, senderName: user.username });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedUser) {
        socket.emit("stop-typing-private", {
          sender: user._id,
          receiver: selectedUser._id,
        });
      } else {
        socket.emit("stop-typing", { room: activeRoom });
      }
    }, 1500);
  };

  const insertMention = (username) => {
    const cursorPos = inputRef.current?.selectionStart || text.length;
    const textUpToCursor = text.slice(0, cursorPos);
    const textAfterCursor = text.slice(cursorPos);
    const replaced = textUpToCursor.replace(/@(\w*)$/, `@${username} `);
    setText(replaced + textAfterCursor);
    setShowMentions(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = replaced.length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !socket) return;

    if (selectedUser) {
      socket.emit("private-message", {
        sender: user._id,
        receiver: selectedUser._id,
        senderName: user.username,
        text: text.trim(),
      });
      socket.emit("stop-typing-private", {
        sender: user._id,
        receiver: selectedUser._id,
      });
    } else {
      socket.emit("send-message", {
        sender: user._id,
        senderName: user.username,
        room: activeRoom,
        text: text.trim(),
      });
      socket.emit("stop-typing", { room: activeRoom });
    }

    setText("");
    setShowEmoji(false);
    setShowMentions(false);
  };

  const handleReaction = (messageId, emoji) => {
    if (!socket) return;
    socket.emit("add-reaction", { messageId, emoji, userId: user._id });
  };

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatClock = (date) => {
    let h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return { time: `${String(h).padStart(2, "0")}:${m}`, ampm };
  };

  const getReactionCounts = (reactions) => {
    if (!reactions) return [];
    const entries =
      reactions instanceof Map
        ? Array.from(reactions.entries())
        : Object.entries(reactions);
    return entries
      .filter(([, users]) => users.length > 0)
      .map(([emoji, users]) => ({
        emoji,
        count: users.length,
        reacted: users.includes(user._id),
      }));
  };

  const renderMessageText = (msgText) => {
    const parts = msgText.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const mentionedName = part.slice(1).toLowerCase();
        const isSelf = mentionedName === user.username.toLowerCase();
        return (
          <span key={i} className={`mention-tag ${isSelf ? "mention-self" : ""}`}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleAvatarClick = (senderName) => {
    if (senderName === user.username) {
      setProfileUser({ ...user, createdAt: user.createdAt });
      return;
    }
    const found = users.find(
      (u) => u.username.toLowerCase() === senderName.toLowerCase()
    );
    if (found) setProfileUser(found);
  };

  return (
    <div className="chat-app">
      <Sidebar
        users={users}
        onlineUsers={onlineUsers}
        currentUser={user}
        activeRoom={activeRoom}
        setActiveRoom={setActiveRoom}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        onLogout={logout}
        onAvatarClick={handleAvatarClick}
      />

      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-left">
            {selectedUser ? (
              <>
                <div
                  className={`avatar ${getAvatarColorClass(selectedUser.username)} header-avatar`}
                  onClick={() => setProfileUser(selectedUser)}
                  style={{ cursor: "pointer" }}
                >
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <h3>{selectedUser.username}</h3>
              </>
            ) : (
              <>
                <span className="chat-header-hash">#</span>
                <h3>{activeRoom}</h3>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="chat-header-sub">{onlineUsers.length} online</span>
            <div className="clock-badge">
              <span className="clock-time">{formatClock(now).time}</span>
              <span className="clock-ampm">{formatClock(now).ampm}</span>
            </div>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <p className="no-messages">No messages yet 👋</p>
          )}

          {messages.map((msg) => {
            const senderId =
              typeof msg.sender === "object" ? msg.sender._id : msg.sender;
            const isOwn = senderId === user._id;
            const reactionCounts = getReactionCounts(msg.reactions);

            return (
              <div
                key={msg._id}
                className={`message-bubble-wrapper ${isOwn ? "own" : "other"}`}
                onMouseEnter={() => setHoveredMsg(msg._id)}
                onMouseLeave={() => setHoveredMsg(null)}
              >
                {!isOwn && (
                  <div
                    className={`msg-avatar ${getAvatarColorClass(msg.senderName)}`}
                    onClick={() => handleAvatarClick(msg.senderName)}
                    style={{ cursor: "pointer" }}
                    title={`View ${msg.senderName}'s profile`}
                  >
                    {msg.senderName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="msg-with-reactions">
                  {hoveredMsg === msg._id && (
                    <div
                      className={`reaction-bar ${
                        isOwn ? "reaction-bar-own" : "reaction-bar-other"
                      }`}
                    >
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          className="reaction-btn"
                          onClick={() => handleReaction(msg._id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    className={`message-bubble ${
                      isOwn ? "own-bubble" : "other-bubble"
                    }`}
                  >
                    {!isOwn && (
                      <div
                        className="msg-sender"
                        onClick={() => handleAvatarClick(msg.senderName)}
                        style={{ cursor: "pointer" }}
                      >
                        {msg.senderName}
                      </div>
                    )}
                    <div className="msg-text">{renderMessageText(msg.text)}</div>
                    <div className="msg-time">{formatTime(msg.createdAt)}</div>
                  </div>

                  {reactionCounts.length > 0 && (
                    <div className="reaction-counts">
                      {reactionCounts.map(({ emoji, count, reacted }) => (
                        <button
                          key={emoji}
                          className={`reaction-count-btn ${reacted ? "reacted" : ""}`}
                          onClick={() => handleReaction(msg._id, emoji)}
                        >
                          {emoji} {count}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {typingUser && (
            <div className="typing-indicator">
              <span className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
              {typingUser} is typing
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSend}>
          <div className="emoji-container">
            <button
              type="button"
              className="emoji-btn"
              onClick={() => setShowEmoji(!showEmoji)}
            >
              😊
            </button>
            {showEmoji && (
              <div className="emoji-picker-box">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
          </div>

          <div className="mention-wrapper">
            {showMentions && (
              <div className="mention-dropdown">
                {mentionList.map((u, i) => (
                  <div
                    key={u._id}
                    className={`mention-item ${
                      i === mentionIndex ? "mention-item-active" : ""
                    }`}
                    onMouseDown={() => insertMention(u.username)}
                  >
                    <div
                      className={`mention-avatar ${getAvatarColorClass(u.username)}`}
                    >
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <span>@{u.username}</span>
                    {onlineUsers.includes(u._id) && (
                      <span className="mention-online-dot" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={handleTyping}
              placeholder={
                selectedUser
                  ? `Message ${selectedUser.username}`
                  : `Message #${activeRoom} — @ se mention karo`
              }
            />
          </div>

          <button type="submit" className="send-btn">➤</button>
        </form>
      </div>

      {profileUser && (
        <ProfileModal
          profileUser={profileUser}
          onlineUsers={onlineUsers}
          onClose={() => setProfileUser(null)}
          onStartChat={
            profileUser._id !== user._id
              ? (u) => setSelectedUser(u)
              : null
          }
        />
      )}
    </div>
  );
}

export default Chat;