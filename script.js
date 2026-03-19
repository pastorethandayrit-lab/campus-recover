import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONFIGURATION
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// 2. CLOUDINARY UPLOAD LOGIC
async function uploadImage(file) {
  const formData = new FormData();
  
  // Clean filename to prevent Supabase/Cloudinary key errors
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const blob = file.slice(0, file.size, file.type);
  const newFile = new File([blob], cleanName, {type: file.type});

  formData.append("file", newFile);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) throw new Error("Cloudinary upload failed. Ensure your preset is 'Unsigned' in settings.");
  
  const data = await res.json();
  return data.secure_url;
}

// 3. MAIN UPLOAD FUNCTION (Fixed Column Names)
async function uploadItem(title, description, type, category, location, date, file) {
  try {
    const imageUrl = await uploadImage(file);

    const { error } = await supabase
      .from("items")
      .insert([{ 
        title: title,        // FIXED: matches your database column
        description: description, 
        type: type,
        category: category,
        location: location,
        date: date,
        status: 'pending', 
        image_url: imageUrl 
      }]);

    if (error) {
      alert("Database error: " + error.message);
    } else {
      alert("Item reported successfully!");
      window.location.href = "index.html"; 
    }
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// 4. FORM EVENT LISTENERS
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Grabbing data based on your specific HTML structure
    const type = e.target.querySelectorAll("select")[0].value;
    const title = e.target.querySelector("input[type=text]").value;
    const category = e.target.querySelectorAll("select")[1].value;
    const description = e.target.querySelector("textarea").value;
    const location = e.target.querySelectorAll("input[type=text]")[1].value;
    const date = e.target.querySelector("input[type=date]").value;
    const file = e.target.querySelector("#itemImage").files[0];

    await uploadItem(title, description, type, category, location, date, file);
  });
}

// 5. AUTHENTICATION (Login/Register/Logout)
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target.querySelector("input[type=email]").value;
    const password = e.target.querySelector("input[type=password]").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Login failed: " + error.message);
    else window.location.href = "index.html";
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    alert("Logged out!");
    window.location.reload();
  });
}

// 6. ADMIN & PROFILE LOGIC
async function checkAdminAndProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  // Admin Section
  const adminSection = document.getElementById("adminSection");
  if (adminSection && data?.role === "admin") {
    adminSection.style.display = "block";
    loadAdminItems();
  }

  // Profile Section
  const userEmail = document.getElementById("userEmail");
  if (userEmail) {
    userEmail.textContent = session.user.email;
    document.getElementById("avatarText").textContent = session.user.email[0].toUpperCase();
    document.getElementById("userRole").textContent = data?.role || "user";
  }
}

async function loadAdminItems() {
  const { data } = await supabase.from("items").select("*");
  const tableBody = document.querySelector("#adminSection table tbody");
  if (tableBody && data) {
    tableBody.innerHTML = data.map(item => `
      <tr>
        <td>${item.title}</td>
        <td>${item.status}</td>
        <td>${item.type}</td>
        <td>
          <button onclick="updateStatus('${item.id}', 'approved')">Approve</button>
        </td>
      </tr>`).join("");
  }
}

window.updateStatus = async (id, status) => {
  await supabase.from("items").update({ status }).eq("id", id);
  loadAdminItems();
};

document.addEventListener("DOMContentLoaded", checkAdminAndProfile);