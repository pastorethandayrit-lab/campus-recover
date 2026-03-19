import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 1. AUTHENTICATION ---
async function handleAuth(e, type) {
  e.preventDefault();
  const email = e.target.querySelector("input[type=email]").value;
  const password = e.target.querySelector("input[type=password]").value;
  
  const { data, error } = type === 'login' 
    ? await supabase.auth.signInWithPassword({ email, password })
    : await supabase.auth.signUp({ email, password });

  if (error) {
    alert(error.message);
  } else {
    window.location.href = "index.html";
  }
}

// --- 2. DATA LOADING & UI ---
async function initApp() {
  const { data: { session } } = await supabase.auth.getSession();
  
  // Update Profile Page & Navbar
  if (session) {
    if (document.getElementById("userEmail")) document.getElementById("userEmail").textContent = session.user.email;
    if (document.getElementById("avatarText")) document.getElementById("avatarText").textContent = session.user.email[0].toUpperCase();

    // Fetch Role from Profiles Table
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
    if (profile && document.getElementById("userRole")) {
        document.getElementById("userRole").textContent = profile.role;
    }

    // Show Admin Section if Admin
    if (document.getElementById("adminSection") && profile?.role === "admin") {
      document.getElementById("adminSection").style.display = "block";
      loadAdminDashboard();
    }
  }

  loadRecentItems();
}

// --- 3. ITEM RENDERING ---
function renderItems(items) {
  const container = document.getElementById("itemsContainer");
  if (!container) return;
  
  container.innerHTML = items.map(item => `
    <div class="card">
      <img src="${item.image_url || 'https://via.placeholder.com/300'}" style="width:100%; height:180px; object-fit:cover; border-radius:8px;">
      <div style="margin-top:10px;">
        <span class="badge ${item.type}">${item.type}</span>
        <h3>${item.title}</h3>
        <p>📍 ${item.location}</p>
        <button onclick="window.claimItem('${item.id}', '${item.type}')" class="btn-claim">
          ${item.type === 'found' ? 'Claim This Item' : 'I Found This!'}
        </button>
      </div>
    </div>
  `).join("");
}

window.claimItem = async (itemId, type) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { alert("Please sign in first!"); window.location.href = "login.html"; return; }
  alert("Success! Request sent to the " + (type === 'found' ? 'finder' : 'owner') + ".");
};

async function loadRecentItems() {
  const { data } = await supabase.from("items").select("*").eq("status", "approved").order("created_at", { ascending: false });
  if (data) renderItems(data);
}

// --- 4. EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  initApp();

  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", (e) => handleAuth(e, 'login'));

  const regForm = document.getElementById("registerForm");
  if (regForm) regForm.addEventListener("submit", (e) => handleAuth(e, 'register'));

  const logoutBtns = document.querySelectorAll("#logoutBtn");
  logoutBtns.forEach(btn => btn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  }));
});