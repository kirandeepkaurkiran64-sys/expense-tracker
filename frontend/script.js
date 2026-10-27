// ---- 1. Check login first: no token means go to the login page ----
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "/login.html";
}

// ---- 2. Grab the HTML elements we need ----
const form = document.getElementById("expense-form");
const list = document.getElementById("expense-list");
const totalEl = document.getElementById("total");
const emptyMsg = document.getElementById("empty");

document.getElementById("hello").textContent = "Hi, " + (localStorage.getItem("name") || "");

const API_URL = "/api/expenses";
let expenses = [];

// ---- 3. Every request carries the token, like showing an ID card ----
function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token,
  };
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("name");
  window.location.href = "/login.html";
}

document.getElementById("logout").addEventListener("click", logout);

// ---- 4. Draw the list and total on screen ----
function render() {
  list.innerHTML = "";

  expenses.forEach(function (e) {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="info">
        <strong>${e.title}</strong>
        <small>${e.category} · ${e.date}</small>
      </div>
      <div class="right">
        <span class="amount">₹${e.amount}</span>
        <button class="delete" data-id="${e.id}">Delete</button>
      </div>`;
    list.appendChild(li);
  });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  totalEl.textContent = "₹" + total;
  emptyMsg.style.display = expenses.length ? "none" : "block";
}

// ---- 5. GET: load this user's expenses ----
async function loadExpenses() {
  try {
    const response = await fetch(API_URL, { headers: authHeaders() });

    if (response.status === 401) {   // token missing, wrong or expired
      logout();
      return;
    }

    expenses = await response.json();
    render();
  } catch (error) {
    alert("Cannot reach the backend. Is the server running?");
  }
}

// ---- 6. POST: add a new expense ----
form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const newExpense = {
    title: document.getElementById("title").value,
    amount: Number(document.getElementById("amount").value),
    category: document.getElementById("category").value,
    date: document.getElementById("date").value,
  };

  await fetch(API_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(newExpense),
  });

  form.reset();
  loadExpenses();
});

// ---- 7. DELETE: remove an expense ----
list.addEventListener("click", async function (event) {
  if (event.target.classList.contains("delete")) {
    const id = event.target.dataset.id;
    await fetch(API_URL + "/" + id, { method: "DELETE", headers: authHeaders() });
    loadExpenses();
  }
});

// ---- 8. When the page opens, load data ----
loadExpenses();
