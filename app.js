const DOMAIN = 'https://learn.01founders.co/';

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        handleLogin();
    });
});

async function handleLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Base64 encode the credentials for Basic Authentication
    const authHeader = "Basic " + btoa(`${username}:${password}`);

    console.log("username:", username)
    console.log("password:", password)

    try {
        // Make a POST request to the authentication endpoint
        const response = await fetch("https://learn.01founders.co/api/auth/signin", {
            method: "POST",
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
        });

        // Check if the request was successful (status code 2xx)
        if (response.ok) {
            // Parse the response JSON to get the JWT data
            const jwtData = await response.json();

            // Log the JWT data to the console (you might want to handle it differently)
            console.log("JWT Data:", jwtData);

            // Save the JWT to localStorage for future use
            localStorage.setItem("jwt", jwtData);
            await useJWT()
        } else {
            // Display an error message or handle unsuccessful login
            console.error("Error during login:", response.statusText);
        }
    } catch (error) {
        // Handle errors that occur during the fetch
        console.error("Error during login:", error);
    }
}

async function useJWT(){

    const jwtToken = localStorage.getItem("jwt");
    console.log("this is  useJWT - JWTToken:", jwtToken)

// Include the JWT in the headers of your fetch request
const response = await fetch(`${DOMAIN}api/graphql-engine/v1/graphql`, {
    method: "GET",
    headers: {
        Authorization: `Bearer ${jwtToken}`,
    },


});
console.log("response:", response)
}