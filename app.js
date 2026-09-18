// =====================================================
// GAMING PASAL - REFERRAL SYSTEM
// =====================================================

// Prevent the script from initializing twice
if (window.__GAMING_PASAL_REFERRAL_LOADED) {
    console.warn("Gaming Pasal Referral app.js already loaded.");
} else {
    window.__GAMING_PASAL_REFERRAL_LOADED = true;

    // =====================================================
    // SUPABASE CONNECTION
    // =====================================================

    const DISCOUNT = 5;

    // Check that Supabase library exists
    if (!window.supabase) {
        console.error("Supabase library not loaded.");
        alert("Supabase library could not be loaded. Please check index.html.");
    } else if (
        !window.SUPABASE_URL ||
        !window.SUPABASE_ANON_KEY ||
        window.SUPABASE_URL === "YOUR_SUPABASE_URL" ||
        window.SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY"
    ) {
        console.error("Supabase configuration is missing.");
        alert("Please add your Supabase URL and public/anon key in config.js.");
    } else {

        // IMPORTANT:
        // window.supabase = Supabase library
        // supabaseClient = your actual Supabase project connection
        const supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_ANON_KEY
        );

        // =====================================================
        // HELPER FUNCTIONS
        // =====================================================

        const $ = id => document.getElementById(id);

        const authCard = $("authCard");
        const dashboard = $("dashboard");
        const msg = $("authMessage");

        function toast(message) {
            const element = $("toast");

            if (!element) return;

            element.textContent = message;
            element.classList.add("show");

            setTimeout(() => {
                element.classList.remove("show");
            }, 2200);
        }

        function cleanCode(value) {
            return (value || "")
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 20);
        }

        function makeCode() {
            if (crypto.randomUUID) {
                return "GP" +
                    crypto.randomUUID()
                        .replaceAll("-", "")
                        .slice(0, 8)
                        .toUpperCase();
            }

            return "GP" +
                Math.random()
                    .toString(36)
                    .substring(2, 10)
                    .toUpperCase();
        }

        function getReferralCodeFromURL() {
            const params = new URLSearchParams(window.location.search);

            return (
                params.get("ref") ||
                localStorage.getItem("gp_ref") ||
                ""
            );
        }

        function saveReferralCode() {
            const referralCode = cleanCode(
                getReferralCodeFromURL()
            );

            if (referralCode) {
                localStorage.setItem("gp_ref", referralCode);
            }

            return referralCode;
        }

        // Save referral code when someone visits:
        // ?ref=GP12345678
        saveReferralCode();

        // =====================================================
        // LOGIN / REGISTER TABS
        // =====================================================

        document.querySelectorAll(".tab").forEach(button => {

            button.addEventListener("click", () => {

                document
                    .querySelectorAll(".tab")
                    .forEach(tab => {
                        tab.classList.remove("active");
                    });

                button.classList.add("active");

                const tab = button.dataset.tab;

                $("loginForm").classList.toggle(
                    "hidden",
                    tab !== "login"
                );

                $("registerForm").classList.toggle(
                    "hidden",
                    tab !== "register"
                );

                if (msg) {
                    msg.textContent = "";
                }
            });

        });

        // =====================================================
        // REGISTER
        // =====================================================

        $("registerForm").addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                if (msg) {
                    msg.textContent = "Creating account...";
                }

                const name = $("regName").value.trim();
                const email = $("regEmail").value.trim();
                const password = $("regPassword").value;

                // Referral code manually entered OR referral URL
                const referralCode =
                    cleanCode($("regReferral").value) ||
                    saveReferralCode();

                // Basic validation
                if (!name) {
                    msg.textContent = "Please enter your name.";
                    return;
                }

                if (!email) {
                    msg.textContent = "Please enter your email.";
                    return;
                }

                if (password.length < 6) {
                    msg.textContent =
                        "Password must be at least 6 characters.";

                    return;
                }

                try {

const redirectUrl =
    window.location.origin + window.location.pathname;

const { data, error } =
    await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            emailRedirectTo: redirectUrl,
            data: {
                name: name,
                referral_code_input: referralCode
            }
        }
    });

                    // Supabase error
                    if (error) {

                        console.error(
                            "Registration error:",
                            error
                        );

                        msg.textContent = error.message;

                        return;
                    }

                    // Account created and automatically logged in
                    if (data.session) {

                        msg.textContent = "";

                        toast(
                            "Account created successfully!"
                        );

                        await loadDashboard();

                    } else {

                        // Email confirmation enabled
                        msg.textContent =
                            "Account created! Please check your email and confirm your account, then log in.";

                    }

                } catch (error) {

                    console.error(
                        "Registration exception:",
                        error
                    );

                    msg.textContent =
                        "Registration failed. Please try again.";

                }

            }
        );

        // =====================================================
        // LOGIN
        // =====================================================

        $("loginForm").addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                msg.textContent = "Signing in...";

                const email =
                    $("loginEmail").value.trim();

                const password =
                    $("loginPassword").value;

                try {

                    const { data, error } =
                        await supabaseClient.auth
                            .signInWithPassword({

                                email: email,

                                password: password

                            });

                    if (error) {

                        console.error(
                            "Login error:",
                            error
                        );

                        msg.textContent =
                            error.message;

                        return;
                    }

                    msg.textContent = "";

                    toast("Login successful!");

                    await loadDashboard();

                } catch (error) {

                    console.error(
                        "Login exception:",
                        error
                    );

                    msg.textContent =
                        "Login failed. Please try again.";

                }

            }
        );

        // =====================================================
        // LOGOUT
        // =====================================================

        $("logout").addEventListener(
            "click",
            async function () {

                try {

                    await supabaseClient.auth.signOut();

                    dashboard.classList.add("hidden");

                    authCard.classList.remove("hidden");

                    msg.textContent = "";

                    toast("Logged out.");

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                }

            }
        );

        // =====================================================
        // LOAD DASHBOARD
        // =====================================================

        async function loadDashboard() {

            try {

                const {
                    data: { user },
                    error: userError
                } = await supabaseClient.auth.getUser();

                if (userError) {

                    console.error(
                        "User error:",
                        userError
                    );

                    return;
                }

                // User is NOT logged in
                if (!user) {

                    dashboard.classList.add("hidden");

                    authCard.classList.remove("hidden");

                    return;
                }

                // User is logged in
                authCard.classList.add("hidden");

                dashboard.classList.remove("hidden");

                // =================================================
                // GET PROFILE
                // =================================================

                const {
                    data: profile,
                    error: profileError
                } = await supabaseClient
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                if (profileError) {

                    console.error(
                        "Profile error:",
                        profileError
                    );

                    toast(
                        "Profile not found. Please run supabase.sql."
                    );

                    return;
                }

                // =================================================
                // DISPLAY USER INFORMATION
                // =================================================

                $("userName").textContent =
                    profile.name ||
                    user.email ||
                    "Customer";

                $("refCode").textContent =
                    profile.referral_code;

                // =================================================
                // CREATE REFERRAL LINK
                // =================================================

                const referralLink =
                    window.location.origin +
                    window.location.pathname +
                    "?ref=" +
                    encodeURIComponent(
                        profile.referral_code
                    );

                $("refLink").textContent =
                    referralLink;

                $("shareInput").value =
                    referralLink;

                // =================================================
                // GET REFERRAL HISTORY
                // =================================================

                const {
                    data: referrals,
                    error: referralError
                } = await supabaseClient
                    .from("referrals")
                    .select(
                        "id,status,created_at,referred_user_id"
                    )
                    .eq(
                        "referrer_id",
                        user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );

                if (referralError) {

                    console.error(
                        "Referral history error:",
                        referralError
                    );

                    return;
                }

                // =================================================
                // DISPLAY REFERRALS
                // =================================================

                if (
                    referrals &&
                    referrals.length > 0
                ) {

                    $("history").innerHTML =
                        referrals
                            .map(referral => {

                                const shortID =
                                    referral.id
                                        .slice(0, 8);

                                return `
                                    <div class="history-row">

                                        <span>
                                            Referral #${shortID}
                                        </span>

                                        <span
                                            class="status ${referral.status}">
                                            ${referral.status}
                                        </span>

                                    </div>
                                `;

                            })
                            .join("");

                } else {

                    $("history").innerHTML = `
                        <p class="muted">
                            No referrals yet.
                        </p>
                    `;

                }

            } catch (error) {

                console.error(
                    "Dashboard error:",
                    error
                );

            }

        }

        // =====================================================
        // COPY REFERRAL CODE
        // =====================================================

        $("copyCode").addEventListener(
            "click",
            async function () {

                const code =
                    $("refCode").textContent;

                try {

                    await navigator.clipboard
                        .writeText(code);

                    toast(
                        "Referral code copied!"
                    );

                } catch (error) {

                    console.error(error);

                    toast(
                        "Unable to copy code."
                    );

                }

            }
        );

        // =====================================================
        // COPY REFERRAL LINK
        // =====================================================

        $("copyLink").addEventListener(
            "click",
            async function () {

                const link =
                    $("shareInput").value;

                try {

                    await navigator.clipboard
                        .writeText(link);

                    toast(
                        "Referral link copied!"
                    );

                } catch (error) {

                    console.error(error);

                    toast(
                        "Unable to copy link."
                    );

                }

            }
        );

        // =====================================================
        // SHARE REFERRAL LINK
        // =====================================================

        $("shareBtn").addEventListener(
            "click",
            async function () {

                const link =
                    $("shareInput").value;

                const shareData = {

                    title:
                        "Gaming Pasal Referral",

                    text:
                        "Get 5% OFF your first eligible Gaming Pasal order!",

                    url: link

                };

                try {

                    if (
                        navigator.share
                    ) {

                        await navigator.share(
                            shareData
                        );

                    } else {

                        await navigator
                            .clipboard
                            .writeText(link);

                        toast(
                            "Referral link copied!"
                        );

                    }

                } catch (error) {

                    // User cancelled share dialog
                    console.log(
                        "Share cancelled."
                    );

                }

            }
        );

        // =====================================================
        // AUTH STATE CHANGE
        // =====================================================

        supabaseClient.auth.onAuthStateChange(
            function (event, session) {

                console.log(
                    "Auth event:",
                    event
                );

                // Small delay prevents Supabase
                // auth-lock related issues
                setTimeout(() => {
                    loadDashboard();
                }, 0);

            }
        );

        // =====================================================
        // INITIAL PAGE LOAD
        // =====================================================

        loadDashboard();

    }
}
