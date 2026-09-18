const DISCOUNT = 5;

const $ = id => document.getElementById(id);
const authCard = $("authCard"), dashboard = $("dashboard"), msg = $("authMessage");

function toast(t){const x=$("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
function cleanCode(s){return (s||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,20)}
function makeCode(){return "GP"+crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase()}
function getRef(){return new URLSearchParams(location.search).get("ref") || localStorage.getItem("gp_ref") || ""}
function saveRef(){const r=cleanCode(getRef());if(r)localStorage.setItem("gp_ref",r);return r}
saveRef();

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); b.classList.add("active");
  $("loginForm").classList.toggle("hidden",b.dataset.tab!=="login");
  $("registerForm").classList.toggle("hidden",b.dataset.tab!=="register");
});

$("loginForm").onsubmit=async e=>{
 e.preventDefault(); msg.textContent="Signing in...";
 const {error}=await supabase.auth.signInWithPassword({email:$("loginEmail").value.trim(),password:$("loginPassword").value});
 msg.textContent=error?error.message:"";
 if(!error) await load();
};

$("registerForm").onsubmit=async e=>{
 e.preventDefault(); msg.textContent="Creating account...";
 const referral=cleanCode($("regReferral").value)||saveRef();
 const {data,error}=await supabase.auth.signUp({email:$("regEmail").value.trim(),password:$("regPassword").value,options:{data:{name:$("regName").value.trim(),referral_code_input:referral}}});
 if(error){msg.textContent=error.message;return}
 if(data.session) await load(); else msg.textContent="Account created. Check your email to confirm, then log in.";
};

$("logout").onclick=async()=>{await supabase.auth.signOut();dashboard.classList.add("hidden");authCard.classList.remove("hidden")};

async function load(){
 const {data:{user}}=await supabase.auth.getUser();
 if(!user){dashboard.classList.add("hidden");authCard.classList.remove("hidden");return}
 authCard.classList.add("hidden");dashboard.classList.remove("hidden");
 const {data:p,error}=await supabase.from("profiles").select("*").eq("id",user.id).single();
 if(error){toast("Profile not ready. Run the SQL setup first.");return}
 $("userName").textContent=p.name||user.email;
 $("refCode").textContent=p.referral_code;
 const link=location.origin+location.pathname+"?ref="+encodeURIComponent(p.referral_code);
 $("refLink").textContent=link;$("shareInput").value=link;
 const {data:rows}=await supabase.from("referrals").select("id,status,created_at,referred_user_id").eq("referrer_id",user.id).order("created_at",{ascending:false});
 $("history").innerHTML=rows?.length?rows.map(r=>`<div class="history-row"><span>Referral #${r.id.slice(0,8)}</span><span class="status ${r.status}">${r.status}</span></div>`).join(""):`<p class="muted">No referrals yet.</p>`;
}
$("copyCode").onclick=()=>navigator.clipboard.writeText($("refCode").textContent).then(()=>toast("Referral code copied"));
$("copyLink").onclick=()=>navigator.clipboard.writeText($("shareInput").value).then(()=>toast("Referral link copied"));
$("shareBtn").onclick=async()=>{const d={title:"Gaming Pasal Referral",text:"Get 5% OFF your first eligible Gaming Pasal order!",url:$("shareInput").value};if(navigator.share)await navigator.share(d);else{await navigator.clipboard.writeText(d.url);toast("Link copied")}};
supabase.auth.onAuthStateChange(()=>load());
load();
