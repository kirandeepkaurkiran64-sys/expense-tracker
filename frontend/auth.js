// If already logged in, go straight to the expenses page
if (localStorage.getItem("token")) {
  window.location.href = "/";
}

const form = document.getElementById("auth-form");
const title = document.getElementById("auth-title");
const nameInput = document.getElementById("name");
const submitBtn = document.getElementById("auth-submit");
const toggleText = document.getElementById("toggle-text");
const toggleLink = document.getElementById("toggle-link");
const errorEl = document.getElementById("auth-error");

let mode = "login"; // "login" or "signup"

// Switch the form between Log in and Sign up
function setMode(newMode) {
  mode = newMode;
  const isSignup = mode === "signup";
  title.textContent = isSignup ? "Create account" : "Log in";
  submitBtn.textContent = isSignup ? "Sign up" : "Log in";
  toggleText.textContent = isSignup ? "Already have an account?" : "New here?";
  toggleLink.textContent = isSignup ? "Log in" : "Create an account";
  nameInput.style.display = isSignup ? "block" : "none";
  nameInput.required = isSignup;
  errorEl.textContent = "";
}
setMode("login");

toggleLink.addEventListener("click", function (event) {
  event.preventDefault();
  setMode(mode === "login" ? "signup" : "login");
});

// Send the form to the backend
form.addEventListener("submit", async function (event) {
  event.preventDefault();
  errorEl.textContent = "";

  const url = mode === "login" ? "/api/login" : "/api/register";
  const body = {
    name: nameInput.value,
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (!response.ok) {
      errorEl.textContent = data.error;   // show "Wrong email or password" etc.
      return;
    }

    // Success: keep the token in the browser, then open the app
    localStorage.setItem("token", data.token);
    localStorage.setItem("name", data.name);
    window.location.href = "/";
  } catch (error) {
    errorEl.textContent = "Cannot reach the server. Is it running?";
  }
});
