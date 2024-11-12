import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, update, child, remove, get, onChildAdded, onChildRemoved } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import * as Popper from 'https://cdn.jsdelivr.net/npm/@popperjs/core@^2/dist/esm/index.js'

const firebaseConfig = {
  apiKey: "AIzaSyADzuyPeyr3zYgoFZYlcZSErMvmYX7WPz8",
  authDomain: "chat-app-460eb.firebaseapp.com",
  projectId: "chat-app-460eb",
  storageBucket: "chat-app-460eb.firebasestorage.app",
  messagingSenderId: "816058723107",
  appId: "1:816058723107:web:fba083a73b23f12f24fa96"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase();
const auth = getAuth(app);
let currentUser = "";

// kiểm tra trạng thái đăng nhập
const buttonLogin = document.querySelector("[button-login]");
const buttonRegister = document.querySelector("[button-register]");
const chat = document.querySelector("[chat]");
const buttonLogout = document.querySelector("[button-logout]");
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    buttonLogout.style.display = "inline-block";
    chat.style.display = "block";
  } else {
    buttonLogin.style.display = "inline-block";
    buttonRegister.style.display = "inline-block";
    if (chat) {
      chat.innerHTML = `<i>vui long dang nhap</i>`;
    }
  }
});


// hiển thị thông báo
const showAlert = (content = null, time = 3000, type = "alert--success") => {
  if (content) {
    const newALert = document.createElement("div");
    newALert.setAttribute("class", `alert ${type}`);
    newALert.innerHTML = `
    <span class="alert__content">${content}</span>
      <span class="alert__close">
        <i class="fa-solid fa-xmark"></i>
      </span>
    `;
    const alertList = document.querySelector(".alert-list");
    alertList.appendChild(newALert);
    const alertClose = newALert.querySelector(".alert__close");
    alertClose.addEventListener("click", () => {
      alertList.removeChild(newALert);
    })
    setTimeout(() => {
      alertList.removeChild(newALert);
    }, time);
  }
}


// TRANG ĐĂNG KÝ
const formRegister = document.querySelector("#form-register");
if (formRegister) {
  formRegister.addEventListener("submit", (event) => {
    event.preventDefault();
    const fullName = formRegister.fullName.value;
    const email = formRegister.email.value;
    const passWord = formRegister.password.value;
    if (fullName && email && passWord) {
      createUserWithEmailAndPassword(auth, email, passWord)
        .then((userCredential) => {
          const user = userCredential.user;
          if (user) {
            set(ref(db, `users/${user.uid}`), {
              fullName: fullName,
              email: email,
            }).then(() => {
              window.location.href = "index.html";
              showAlert("dang ky thanh cong", 3000);
            });
          }
        })
        .catch((error) => {
          showAlert("email hoac mat khau khong chinh xac", 3000, "alert--error");
        });
    }
  })
}


// TRANG ĐĂNG NHẬP
const formLogin = document.querySelector("#form-login");
if (formLogin) {
  formLogin.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = formLogin.email.value;
    const password = formLogin.password.value;
    if (email && password) {
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          window.location.href = "index.html";
          showAlert("dang nhap thanh cong", 3000);
        })
        .catch((error) => {
          showAlert("email hoac mat khau khong chinh xac", 3000, "alert--error");
        });
    }
  })
}


// ĐĂNG XUẤT
if (buttonLogout) {
  buttonLogout.addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "login.html";
    }).catch((error) => {
      // An error happened.
    });
  })
}


// TÍNH NĂNG CHAT CƠ BẢN
//FORM CHAT
const innerForm = document.querySelector("[chat] .inner-form");
if (innerForm) {
  // GỬI TIN  NHẮN BẰNG HÌNH ẢNH PREVIEW IMAGE
  const upload = new FileUploadWithPreview.FileUploadWithPreview('upload-images', {
    maxFileCount: 6,
    multiple: true
  });

  innerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = innerForm.content.value;
    const userId = auth.currentUser.uid;
    const images = upload.cachedFileArray || [];

    if ((content || images.length > 0) && userId) {
      const imageLink = [];

      if (images.length > 0) {
        const url = 'https://api.cloudinary.com/v1_1/dlhxktrw3/image/upload';

        const formData = new FormData();

        for (let i = 0; i < images.length; i++) {
          let file = images[i];
          formData.append('file', file);
          formData.append('upload_preset', 'fx6smnop');

          await fetch(url, {
            method: 'POST',
            body: formData,
          })
            .then((response) => {
              return response.json();
            })
            .then((data) => {
              imageLink.push(data.url);
            });
        }
      }

      set(push(ref(db, 'chats')), {
        content: content,
        userId: userId,
        image: imageLink,
      });
      console.log(imageLink);
      innerForm.content.value = "";
      upload.resetPreviewPanel();  // XÓA ẢNH SAU KHI SUBMIT  
    }
  })
}


// HIỂN THỊ TIN NHẮN TRONG BOX CHAT
const chatBody = document.querySelector("[chat] .inner-body");
if (chatBody) {
  const chatsRef = ref(db, 'chats');
  onChildAdded(chatsRef, (data) => {
    const key = data.key;
    const userId = data.val().userId;
    const content = data.val().content;
    const image = data.val().image;
    let userName = "";
    let buttonEdit = "";

    const dbRef = ref(db);
    get(child(dbRef, `users/${userId}`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const name = snapshot.val().fullName;
          const newChat = document.createElement("div");
          newChat.setAttribute("chat-id", key);
          if (userId == currentUser.uid) {
            newChat.classList.add("inner-outgoing");
            buttonEdit = `
                        <button class="button-edit" data-id = "${key}">
                          <i class="fa-regular fa-trash-can"></i>
                        </button>
                        `;
          } else {
            newChat.classList.add("inner-incoming");
            userName = `
                        <div class="inner-name">
                          ${name}
                        </div>
                      `;
          }

          let htmlContent = "";
          if (content) {
            htmlContent = `
            <div class="inner-content">
              ${content}
            </div>
            `;
          }
          let htmlImages = "";
          if (image && image.length > 0) {
            htmlImages += `<div class="inner-images">`;

            for (const imageItem of image) {
              htmlImages += `<img src ="${imageItem}" />`;
            }

            htmlImages += `</div>`;
          }
          newChat.innerHTML = `
                                ${buttonEdit}
                                ${userName}
                                ${htmlContent}
                                ${htmlImages}
                              `;
          chatBody.appendChild(newChat);
          chatBody.scrollTop = chatBody.scrollHeight;

          // BUTTON XÓA TIN NHẮN TRONG BOX CHAT
          const buttonEditElement = newChat.querySelector(".button-edit");
          if (buttonEditElement) {
            buttonEditElement.addEventListener("click", () => {
              const idChat = buttonEditElement.getAttribute("data-id");
              remove(ref(db, `chats/${idChat}`))
            })
          }

          // ViewerJS
          new Viewer(newChat);
          // ViewerJS
        } else {
          console.log("khong co du lieu");
        }
      }).catch((error) => {
        console.error(error);
      });
  });

  // NHẮC CÁC GIAO DIỆN ĐANG HOẠT ĐỘNG CÙNG LÚC LOẠI BỎ TIN NHẮN ĐÓ TRÊN GIAO DIỆN NGƯỜI DÙNG REALTIME
  onChildRemoved(chatsRef, (data) => {
    const messageId = data.key; // ID của tin nhắn đã xóa
    const messageElement = chatBody.querySelector(`[chat-id="${messageId}"]`);
    if (messageElement) {
      chatBody.removeChild(messageElement); // Xóa tin nhắn khỏi giao diện
      console.log("Message removed from UI:", messageId);
    }
  });
}


// GỬI TIN NHẮN ICON - EMO
const emojiPicker = document.querySelector('emoji-picker');
const body = document.querySelector("body");
if (emojiPicker) {
  const button = document.querySelector(".button-icon");
  const buttonIcon = document.querySelector(".button-icon i");
  const tooltip = document.querySelector('.tooltip');
  // CÀI ĐẶT POPUP HIỂN THỊ EMOJI-PICKER
  Popper.createPopper(button, tooltip);
  Popper.createPopper(button, tooltip, { placement: 'top-end' });
  button.addEventListener("click", () => {
    tooltip.classList.toggle('shown');
  })
  const inputChat = document.querySelector(".chat .inner-form input[name='content']")
  emojiPicker.addEventListener('emoji-click', (event) => {
    const icon = event.detail.unicode;
    inputChat.value += icon;
  });
  // CLICK RA NGOÀI ĐỂ HỦY POPUP EMOJI
  document.addEventListener("click", (event) => {
    if (!emojiPicker.contains(event.target) && (event.target != buttonIcon && event.target != button)) {
      tooltip.classList.remove('shown');
    }
  })
}








