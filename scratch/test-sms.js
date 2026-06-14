const api_key = "DG8G4TkT03BeLevd3Pnt6W0KFkCHk9EgOW12YCeb";
const sender_id = "b3e410a4-5c56-4cb5-9584-d4c8332230df"; // Real approved UUID

async function runTest() {
    console.log("Starting BulkClix SMS JS test...");
    const phone = "0247454824"; // User's phone
    const message = "OTracker Alert: Live SMS integration is working successfully via BulkClix!";

    try {
        const response = await fetch("https://api.bulkclix.com/api/v1/sms-api/send", {
            method: "POST",
            headers: {
                "x-api-key": api_key,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sender_id: sender_id,
                message: message,
                recipients: [phone]
            })
        });

        const status = response.status;
        const text = await response.text();
        console.log("HTTP Status Code:", status);
        console.log("Response Body:", text);
    } catch (e) {
        console.error("Fetch request crashed:", e);
    }
}

runTest();
