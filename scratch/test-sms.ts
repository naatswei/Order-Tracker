const api_key = "DG8G4TkT03BeLevd3Pnt6W0KFkCHk9EgOW12YCeb";
const sender_id = "b3e410a4-5c56-4cb5-9584-d4c8332230df"; // The actual approved UUID

async function runTest() {
    console.log("Starting BulkClix SMS test with real UUID and number...");
    const phone = "0247454824"; // The user's actual phone number from the test order
    const message = "OTracker Alert: Your order test alert is live and working via BulkClix!";

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
        console.log("Raw Response Body:", text);
    } catch (e: any) {
        console.error("Fetch request crashed:", e);
    }
}

runTest();
