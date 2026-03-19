import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONFIGURATION
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// 2. IMAGE UPLOAD (Cloudinary)
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Image upload failed.");
  const data = await res.json();
  return data.secure_url;
}

// 3. ITEM ACTIONS
async function uploadItem(title, description, type, category, location, date, file) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Please login first!"); return; }

    const imageUrl = await uploadImage(file);
    const { error } = await supabase.from("items").insert([{ 
      title, description, type, category, location, date,
      status: 'pending', image_url: imageUrl, user_id: user.id 
    }]);

    if (error) throw error;
    alert("Success! Waiting for admin approval.");
    window.location.href = "index.html";
  } catch (err) { alert(err.message); }
}

window.claimItem = async (itemId, type) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { alert("Sign in to claim!"); window.location.href = "login.html"; return; }
  alert(`Request sent! The ${type === 'found' ? 'finder' : 'owner'} has been notified.`);
};

// 4. RENDERING & LOADING
function renderItems(items) {
  const container = document.getElementById("itemsContainer");
  if (!container) return;
  container.innerHTML = items.map(item => `
    <div class="card">
      <img src="${item.image_url}" style="width:100%; height:200px; object-fit:cover; border-radius:8px;">
      <div style="padding:15px;">
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

async function loadData() {
  const { data } = await supabase.from("items").select("*").eq("status", "approved").order("created_at", { ascending: false });
  if (data) renderItems(data);
}

// 5. AUTHENTICATION
async function handleAuth(e, type) {
  e.preventDefault();
  const email = e.target.querySelector("input[type=email]").value;
  const password = e.target.querySelector("input[type=password]").value;
  
  const { error } = type === 'login' 
    ? await supabase.auth.signInWithPassword({ email, password })
    : await supabase.auth.signUp({ email, password });

  if (error) alert(error.message);
  else window.location.href = "index.html";
}

// 6. INITIALIZE EVERYTHING
document.addEventListener("DOMContentLoaded", async () => {
  loadData();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (session && document.getElementById("userEmail")) {
    document.getElementById("userEmail").textContent = session.user.email;
    document.getElementById("avatarText").textContent = session.user.email[0].toUpperCase();
  }

  // Setup Forms
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", (e) => handleAuth(e, 'login'));

  const regForm = document.getElementById("registerForm");
  if (regForm) regForm.addEventListener("submit", (e) => handleAuth(e, 'register'));

  const upForm = document.getElementById("uploadForm");
  if (upForm) {
    upForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fields = e.target.querySelectorAll("input, select, textarea");
      await uploadItem(fields[1].value, fields[3].value, fields[0].value, fields[2].value, fields[4].value, fields[5].value, fields[6].files[0]);
    });
  }

  const logoutBtns = document.querySelectorAll("#logoutBtn");
  logoutBtns.forEach(btn => btn.addEventListener("click", () => supabase.auth.signOut().then(() => window.location.href = "login.html")));
});