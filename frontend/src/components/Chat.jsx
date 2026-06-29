import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth, API_URL } from "../context/AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";
import EmojiPicker from "emoji-picker-react";

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

  const [activeRoom, setActiveRoom] =
    useState("general");

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [typingUser, setTypingUser] =
    useState("");

  const [showEmoji, setShowEmoji] =
    useState(false);

  const messagesEndRef =
    useRef(null);

  const typingTimeoutRef =
    useRef(null);

  const authHeader = {

    headers: {

      Authorization:

        `Bearer ${user.token}`

    }

  };


  const roomId =

    selectedUser

      ?

      [

        user._id,

        selectedUser._id

      ]

        .sort()

        .join("_")

      :

      activeRoom;



  useEffect(() => {

    const fetchUsers = async () => {

      try {

        const res =

          await axios.get(

            `${API_URL}/auth/users`,

            authHeader

          );

        setUsers(

          res.data

        );

      }

      catch (err) {

        console.log(

          err

        );

      }

    };

    fetchUsers();

  }, []);




  useEffect(() => {

    const fetchMessages =

      async () => {

        try {

          let url;

          if (

            selectedUser

          ) {

            url =

              `${API_URL}/messages/private/${selectedUser._id}`;

          }

          else {

            url =

              `${API_URL}/messages/${activeRoom}`;

          }


          const res =

            await axios.get(

              url,

              authHeader

            );

          setMessages(

            res.data

          );

        }

        catch (err) {

          console.log(

            err

          );

        }

      };


    fetchMessages();


    if (

      socket

      &&

      !selectedUser

    ) {

      socket.emit(

        "join-room",

        activeRoom

      );

    }

  },

    [

      activeRoom,

      selectedUser,

      socket

    ]

  );



  useEffect(() => {

    if (

      socket

      &&

      selectedUser

    ) {

      socket.emit(

        "join-private-room",

        roomId

      );

    }

  },

    [

      selectedUser,

      socket

    ]

  );



  useEffect(() => {

    if (!socket)

      return;


    socket.on(

      "receive-message",

      (message) => {

        if (

          message.room

          ===

          activeRoom

        ) {

          setMessages(

            prev =>

              [

                ...prev,

                message

              ]

          );

        }

      }

    );


    socket.on(

      "receive-private-message",

      (message) => {

        setMessages(

          prev =>

            [

              ...prev,

              message

            ]

        );

      }

    );


    socket.on(

      "online-users",

      (onlineList) => {

        setOnlineUsers(

          onlineList

        );

      }

    );


    socket.on(

      "typing",

      (senderName) => {

        setTypingUser(

          senderName

        );

      }

    );


    socket.on(

      "typing-private",

      (senderName) => {

        setTypingUser(

          senderName

        );

      }

    );


    socket.on(

      "stop-typing",

      () => {

        setTypingUser(

          ""

        );

      }

    );


    socket.on(

      "stop-typing-private",

      () => {

        setTypingUser(

          ""

        );

      }

    );



    return () => {

      socket.off(

        "receive-message"

      );

      socket.off(

        "receive-private-message"

      );

      socket.off(

        "online-users"

      );

      socket.off(

        "typing"

      );

      socket.off(

        "typing-private"

      );

      socket.off(

        "stop-typing"

      );

      socket.off(

        "stop-typing-private"

      );

    };

  },

    [

      socket,

      activeRoom

    ]

  );



  useEffect(() => {

    messagesEndRef

      .current

      ?.scrollIntoView({

        behavior:

          "smooth"

      });

  },

    [

      messages

    ]

  );
  const handleSend = (e) => {
  e.preventDefault();

  if (!text.trim()) return;

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
    const messageData = {
      sender: user._id,
      senderName: user.username,
      room: activeRoom,
      text: text.trim(),
    };

    socket.emit(
      "send-message",
      messageData
    );

    socket.emit(
      "stop-typing",
      {
        room: activeRoom,
      }
    );
  }

  setText("");
  setShowEmoji(false);
};

const handleTyping = (e) => {

  setText(e.target.value);

  if (!socket) return;

  if (selectedUser) {

    socket.emit(
      "typing-private",
      {
        sender: user._id,
        receiver: selectedUser._id,
        senderName: user.username,
      }
    );

  } else {

    socket.emit(
      "typing",
      {
        room: activeRoom,
        senderName: user.username,
      }
    );

  }

  if (typingTimeoutRef.current) {

    clearTimeout(
      typingTimeoutRef.current
    );

  }

  typingTimeoutRef.current = setTimeout(() => {

    if (selectedUser) {

      socket.emit(
        "stop-typing-private",
        {
          sender: user._id,
          receiver: selectedUser._id,
        }
      );

    } else {

      socket.emit(
        "stop-typing",
        {
          room: activeRoom,
        }
      );

    }

  }, 1500);

};

const handleEmojiClick = (emojiData) => {

  setText(
    (prev) =>
      prev + emojiData.emoji
  );

};

const formatTime = (dateStr) => {

  const date =
    new Date(dateStr);

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );

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

/>

<div className="chat-main">

<div className="chat-header">

<div className="chat-header-left">

{

selectedUser

?

<>

<h3>

{selectedUser.username}

</h3>

</>

:

<>

<span

className=

"chat-header-hash"

>

#

</span>

<h3>

{activeRoom}

</h3>

</>

}

</div>

<span

className=

"chat-header-sub"

>

{

onlineUsers.length

}

online

</span>

</div>



<div

className=

"chat-messages"

>

{

messages.length===0

&&

(

<p

className=

"no-messages"

>

No messages yet 👋

</p>

)

}



{

messages.map(

(msg)=>{

const isOwn =

msg.sender===

user._id ||

msg.sender?._id===

user._id;

return(

<div

key={msg._id}

className={

`message-bubble-wrapper

${

isOwn

?

"own"

:

"other"

}`

}

>

{

!isOwn &&

(

<div

className={`

msg-avatar

${

getAvatarColorClass(

msg.senderName

)

}

`}

>

{

msg.senderName

.charAt(0)

.toUpperCase()

}

</div>

)

}



<div

className={`

message-bubble

${

isOwn

?

"own-bubble"

:

"other-bubble"

}

`}

>

{

!isOwn &&

(

<div

className=

"msg-sender"

>

{

msg.senderName

}

</div>

)

}



<div

className=

"msg-text"

>

{

msg.text

}

</div>



<div

className=

"msg-time"

>

{

formatTime(

msg.createdAt

)

}

</div>

</div>

</div>

)

}

)

}



{

typingUser

&&

(

<div

className=

"typing-indicator"

>

<span

className=

"typing-dots"

>

<span>

</span>

<span>

</span>

<span>

</span>

</span>

{

typingUser

}

is typing

</div>

)

}



<div

ref={messagesEndRef}

/>

</div>



<form

className=

"chat-input-area"

onSubmit={handleSend}

>

<div

className=

"emoji-container"

>

<button

type="button"

className=

"emoji-btn"

onClick={()=>

setShowEmoji(

!showEmoji

)

}

>

😊

</button>



{

showEmoji

&&

(

<div

className=

"emoji-picker-box"

>

<EmojiPicker

onEmojiClick={

handleEmojiClick

}

/>

</div>

)

}

</div>



<input

type="text"

value={text}

onChange={handleTyping}

placeholder={

selectedUser

?

`Message ${selectedUser.username}`

:

`Message #${activeRoom}`

}

/>



<button

type="submit"

className=

"send-btn"

>

➤

</button>

</form>

</div>

</div>

);

}

export default Chat;