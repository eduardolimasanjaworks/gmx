fetch("http://91.99.137.101:8057/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "techfala@techfala365.com.br", password: "123" })
}).then(async res => {
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
}).catch(console.error);
