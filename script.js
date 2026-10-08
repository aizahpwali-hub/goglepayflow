(() => {
  "use strict";

  const USERS_KEY = "payflow_users";
  const SESSION_KEY = "payflow_session";
  const START_BALANCE = 1000;

  const $ = (id) => document.getElementById(id);
  const views = { landing: $("landing"), auth: $("auth"), app: $("app") };
  let filter = "all";
  let lastBalance = null;

  const money = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  /* Storage */
  const loadUsers = () => {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch { return {}; }
  };
  const saveUsers = (u) => localStorage.setItem(USERS_KEY, JSON.stringify(u));
  const getSession = () => localStorage.getItem(SESSION_KEY);

  const ensureUser = (users, email) => {
    if (!users[email]) users[email] = { balance: START_BALANCE, tx: [] };
    return users[email];
  };

  /* Views */
  function show(name) {
    Object.entries(views).forEach(([k, el]) => (el.hidden = k !== name));
    const signedIn = name === "app";
    $("signOutBtn").hidden = !signedIn;
    $("getStartedBtn").hidden = signedIn;
    $("navFeatures").hidden = signedIn;
    window.scrollTo({ top: 0 });
  }

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* Render dashboard */
  function render() {
    const email = getSession();
    const users = loadUsers();
    const user = email && users[email];
    if (!user) return show("landing");

    $("userEmail").textContent = email;
    const balEl = $("balance");
    balEl.textContent = money(user.balance);
    if (lastBalance !== null && lastBalance !== user.balance) {
      balEl.classList.remove("bump");
      void balEl.offsetWidth;
      balEl.classList.add("bump");
    }
    lastBalance = user.balance;

    const incoming = user.tx.filter((t) => t.type !== "sent").reduce((s, t) => s + t.amount, 0);
    const outgoing = user.tx.filter((t) => t.type === "sent").reduce((s, t) => s + t.amount, 0);
    $("statIn").textContent = money(incoming);
    $("statOut").textContent = money(outgoing);
    $("statCount").textContent = user.tx.length;

    const list = user.tx
      .filter((t) => filter === "all" || (filter === "sent" ? t.type === "sent" : t.type !== "sent"))
      .sort((a, b) => b.ts - a.ts);

    $("txList").innerHTML = list.map((t) => {
      const out = t.type === "sent";
      const title = t.type === "topup" ? "Wallet top up" : out ? `To ${escapeHtml(t.peer)}` : `From ${escapeHtml(t.peer)}`;
      const when = new Date(t.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const note = t.note ? ` &middot; ${escapeHtml(t.note)}` : "";
      return `<li class="tx">
        <span class="tx-icon ${out ? "out" : "in"}">${out ? "&uarr;" : "&darr;"}</span>
        <span class="tx-meta">${title}<small>${when}${note}</small></span>
        <span class="tx-amount ${out ? "neg" : "pos"}">${out ? "-" : "+"}${money(t.amount)}</span>
      </li>`;
    }).join("");
    $("emptyState").hidden = list.length > 0;
    show("app");
  }

  /* Actions */
  function signIn(email) {
    const users = loadUsers();
    ensureUser(users, email);
    saveUsers(users);
    localStorage.setItem(SESSION_KEY, email);
    lastBalance = null;
    render();
  }

  function sendPayment(to, amount, note) {
    const from = getSession();
    const users = loadUsers();
    const sender = users[from];
    if (to === from) return "You cannot send money to yourself.";
    if (!(amount > 0)) return "Enter an amount greater than zero.";
    if (amount > sender.balance) return "Not enough balance for this payment.";

    const receiver = ensureUser(users, to);
    const ts = Date.now();
    sender.balance = Math.round((sender.balance - amount) * 100) / 100;
    receiver.balance = Math.round((receiver.balance + amount) * 100) / 100;
    sender.tx.push({ id: ts + "s", type: "sent", peer: to, amount, note, ts });
    receiver.tx.push({ id: ts + "r", type: "received", peer: from, amount, note, ts });
    saveUsers(users);
    return null;
  }

  /* Events */
  const goAuth = () => (getSession() ? render() : show("auth"));
  $("getStartedBtn").addEventListener("click", goAuth);
  $("heroStart").addEventListener("click", goAuth);
  $("brand").addEventListener("click", (e) => {
    e.preventDefault();
    getSession() ? render() : show("landing");
  });

  $("authForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("authEmail").value.trim().toLowerCase();
    if (!isEmail(email)) return ($("authError").textContent = "Enter a valid email address.");
    $("authError").textContent = "";
    signIn(email);
  });

  $("sendForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const to = $("toEmail").value.trim().toLowerCase();
    const amount = Math.round(parseFloat($("amount").value) * 100) / 100;
    const note = $("note").value.trim();
    if (!isEmail(to)) return ($("sendError").textContent = "Enter a valid recipient email.");
    const err = sendPayment(to, amount, note);
    $("sendError").textContent = err || "";
    if (err) return;
    e.target.reset();
    render();
    toast(`Sent ${money(amount)} to ${to}`);
  });

  $("topUpBtn").addEventListener("click", () => {
    const email = getSession();
    const users = loadUsers();
    const ts = Date.now();
    users[email].balance += 100;
    users[email].tx.push({ id: ts + "t", type: "topup", peer: "PayFlow", amount: 100, note: "", ts });
    saveUsers(users);
    render();
    toast("Added $100.00 to your wallet");
  });

  $("signOutBtn").addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    show("landing");
  });

  document.querySelectorAll(".chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      filter = chip.dataset.filter;
      render();
    })
  );

  /* Real time updates across tabs */
  window.addEventListener("storage", (e) => {
    if (e.key === USERS_KEY || e.key === SESSION_KEY) render();
  });

  /* Init */
  getSession() ? render() : show("landing");
})();
