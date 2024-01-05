const DOMAIN = 'https://learn.01founders.co/api/graphql-engine/v1/graphql/';

//Creates container to append all results to 
const resultContainer = document.createElement("div");
resultContainer.id = "resultContainer";
resultContainer.style.width = '100%';
resultContainer.style.textAlign = 'center';
document.body.appendChild(resultContainer);

//When submit is pressed on log in form trigger handle login function
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        handleLogin();
    });
});


// HANDLES LOG IN 
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

            //If log in is correct login-form is hidden
            document.getElementById("login-form").style.display = "none";

            //Calls function to display data
            await displayData()

        } else {
            // Display an error message or handle unsuccessful login
            document.getElementById("error-message").textContent = "Incorrect username or password.";
        }
    } catch (error) {
        // Handle errors that occur during the fetch
        console.error("Error during login:", error);
    }
}


//CONTAINS ALL DATA TO BE DISPLAYED
async function displayData() {

   //log out button must be displayed at all times when logged in, if clicked call handleLogout function
    const logoutButton = document.createElement("button");
    logoutButton.textContent = "Logout";
    logoutButton.id = "logoutButton";
    logoutButton.addEventListener("click", handleLogout);
    resultContainer.appendChild(logoutButton);

    //displays user login info and appends to result container
   const displayUserLogin = await getUserLogin()
   appendToResultContainer(`User Login: ${displayUserLogin}`);
   
   //displays users audit ratio and appends to result container
   const auditRatioResult = await auditRatio()
   appendToResultContainer(`Audit Ratio: ${auditRatioResult}`);

   //displays users total XP and appends to result container
   const XP = await calculateXP()
   appendToResultContainer(`XP: ${XP}`);

   //calls SVGcalculateXP to create and display bar graph
   await SVGcalculateXP()

   //calls fetchAndCalculateSkillTotals to create and display pie chart
   await fetchAndCalculateSkillTotals();
}


//DEALS WITH LOGOUT
function handleLogout() {
    // Clear the JWT token from localStorage
    localStorage.removeItem("jwt");
  
    // Clear the content in the result container
    resultContainer.innerHTML = "";
  
    // Show the reset login form
    const loginForm = document.getElementById("login-form");
    loginForm.style.display = "block";
    loginForm.reset();
}

//FETCHES DATA FROM ENDPOINT DEPENDENT ON QUERY
async function fetchData(inputQuery) {
    try {
        const jwtToken = localStorage.getItem("jwt");

        const response = await fetch(DOMAIN, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${jwtToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: inputQuery
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;
    } catch (error) {
        console.error('Error:', error);
        throw error; // Re-throw the error to propagate it to the caller if needed
    }
}

//USED TO APPEND TO RESULT DIV
function appendToResultContainer(data) {
    // Create a new paragraph element
    const paragraph = document.createElement("p");

    // Set the text content of the paragraph to the data
    paragraph.textContent = data;

    // Append the paragraph to the result container
    resultContainer.appendChild(paragraph);
}



//USER INFO SECTION BEGINS HERE
//nested query to find user login data
const userInfoquery = `
query {
    user {
         login      
    } result {
        id
        user{
            id
            login
        }
    }
}
`;

//used to get user login data from query
async function getUserLogin() {

    let responseData = await fetchData(userInfoquery)
    const userLogin = responseData.data.user[0].login
    console.log("This is user Login:", userLogin)

    return userLogin
}



//AUDIT RATIO SECTION BEGINS HERE
//basic query to find audit ratio data
const queryAuditRatio = `
query {
    transaction {
        type
        amount
    }
}
`;

//used to get user audit ratio from query
async function auditRatio() {

let responseData = await fetchData(queryAuditRatio)
const transactions = responseData.data.transaction;

let totalUp = 0;
let totalDown = 0;

//chooses particular transactions labeled up and down
transactions.forEach((transaction) => {
    if (transaction.type === "up") {
        totalUp += transaction.amount;
    } else if (transaction.type === "down") {
        totalDown += transaction.amount;
    }
});

//does the calculation to find audit ratio and then rounds it
const auditRatio = totalUp / totalDown;
const roundedAuditRatio = Math.round(auditRatio * 10) / 10;

// Log or display the calculated audit ratio
console.log("Audit Ratio:", roundedAuditRatio);
return roundedAuditRatio
 }



//XP AREA BEGINS HERE
//a query with arguments which selects paths with %div-01% but not those with the extension /piscine-js-up/%
const queryXP = `query{
    transaction(where: {_and: [
        {path: {_like: "%div-01%"}},
        {path: {_nlike: "%div-01/piscine-js-up/%"}},

    ],type :{_eq : "xp"}}){
        amount
        createdAt
    }
    }`;

//used to get the users total XP
async function calculateXP() {

    let XPData = await fetchData(queryXP)

    //does the calculation to add all XP values together and round the total
    const totalAmount = XPData.data.transaction.reduce((total, entry) => total + entry.amount, 0);
    const roundedTotal = Math.round(totalAmount / 1000) * 1000;

    console.log("Total XP (rounded):", roundedTotal);
    return roundedTotal
}


//SVG SECTIONS BEGIN HERE
//SVG query to get projects, XP gained and date of completion all used to create bar graph
const SVGqueryXP = `query{
    transaction(where: {_and: [
        {path: {_like: "%div-01%"}},
        {path: {_nlike: "%div-01/piscine-js-up/%"}},

    ],type :{_eq : "xp"}}){
        path
        amount
        createdAt
    }
    }`;


// function calculates XP earned for each project and date earned for chronology
async function SVGcalculateXP() {
    try {
        let SVGXPData = await fetchData(SVGqueryXP);

        // Ensure SVGXPData is an array
        if (!Array.isArray(SVGXPData) && SVGXPData.data && Array.isArray(SVGXPData.data.transaction)) {
            SVGXPData = SVGXPData.data.transaction;
        } else {
            throw new Error('Data is not in the expected format.');
        }

        SVGXPData.forEach(entry => {
            entry.projectName = entry.path.substring(15); // Trim the first 15 characters from the path
            entry.createdAt = new Date(entry.createdAt); // Update 'createdAt' to be a Date object
            delete entry.path; // Remove the original 'path' property 
        });

        // Sort the SVGXPData based on the createdAt property
        SVGXPData.sort((a, b) => a.createdAt - b.createdAt);

        // Call the createBarGraph function with newly manipulated data
        createBarGraph(SVGXPData);
    } catch (error) {
        console.error('Error during SVGcalculateXP:', error);
    }
}


//used to create SVG bar graph 
function createBarGraph(data) {

    //creates svg element and name it
    const svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgContainer.id = "svgContainer";   
    svgContainer.style.overflow = 'auto';
    
    svgContainer.setAttribute('width', '1600'); // Set the width of the SVG container
    svgContainer.setAttribute('height', '800'); // Set the height of the SVG container
    
    const barWidth = 30; //width of each bar
    const barSpacing = 5; //spacing between bars 
    const maxHeight = 500; //maximum height of the bars

    // Iterate through the data to create bars
    data.forEach((entry, index) => {
        const barHeight = (entry.amount / 150000) * maxHeight; // Scale the bar height based on the amount

        // Create a rectangle (bar) element
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', index * (barWidth + barSpacing)); // Set the x-coordinate
        rect.setAttribute('y', maxHeight - barHeight); // Set the y-coordinate
        rect.setAttribute('width', barWidth); // Set the width of the bar
        rect.setAttribute('height', barHeight); // Set the height of the bar
        rect.setAttribute('fill', 'blue'); // Set the fill color

        // Append the rectangle to the SVG container
        svgContainer.appendChild(rect);

        // Create a text element for project name
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', index * (barWidth + barSpacing) + barWidth / 2); // Set the x-coordinate for the text
        text.setAttribute('y', maxHeight + 15); // Set the y-coordinate for the text
        text.setAttribute('text-anchor', 'right'); // Set text anchor to middle
        text.setAttribute('dominant-baseline', 'hanging'); // Align text to the top
        text.setAttribute('transform', `rotate(90 ${index * (barWidth + barSpacing) + barWidth / 2},${maxHeight + 15})`); // Rotate the text vertically
        text.textContent = entry.projectName; // Set the text content

        // Append the text to the SVG container
        svgContainer.appendChild(text);

        const xpText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xpText.setAttribute('x', index * (barWidth + barSpacing) + barWidth / 2); // Set the x-coordinate for the text
        xpText.setAttribute('y', maxHeight - barHeight - 3); // Set the y-coordinate for the text (above the bar)
        xpText.setAttribute('text-anchor', 'middle'); // Set text anchor to the middle
        xpText.setAttribute('font-size', '10');
        xpText.textContent = entry.amount; // Set the text content
    
        // Append the text to the SVG container
        svgContainer.appendChild(xpText);
    });
    // Append the SVG container to the resultContainer
    resultContainer.appendChild(svgContainer);
}


//PIE CHART FOR SKILLS NOW
//a query with arguments which selects all types of skill
const skillsQuery = `
  query {
    transaction(where: { type: { _in: ["skill_prog", "skill_algo", "skill_sys-admin", "skill_front-end", "skill_back-end", "skill_stats", "skill_game"] } }) {
      type
      amount
    }
  }
`;

//gets all data from skill 
async function fetchSkillsData() {
    try {
      const skillsData = await fetchData(skillsQuery);
      return skillsData;
    } catch (error) {
      console.error('Error during skill data fetch:', error);
    }
  }
   
// calculates percentages for each skill to be fed into pie chart
function calculateSkillTotals(skillsData) {
    try {
      // Extract the skills array from skillsData
      const skillsArray = skillsData.data.transaction; 
  
      // Check if skillsArray is an array
      if (Array.isArray(skillsArray)) {
        const skillTotals = {};
        let totalAmount = 0;
  
        // Calculate totals for each skill and totalAmount of all skills
        skillsArray.forEach(skill => {
          const type = skill.type;
          const amount = skill.amount;
  
          if (type in skillTotals) {
            skillTotals[type] += amount;
          } else {
            skillTotals[type] = amount;
          }
  
          totalAmount += amount;
        });
  
        // Calculate percentages
        const skillPercentages = {};
        for (const [type, amount] of Object.entries(skillTotals)) {
          skillPercentages[type] = (amount / totalAmount) * 100;
        }
  
        console.log('Skill Percentages:', skillPercentages);
        return skillPercentages;
      } else {
        throw new Error('Skills data is not in the expected array format.');
      }
    } catch (error) {
      console.error('Error calculating skill totals:', error);
      return null; // Or handle the error in a way that fits your application
    }
  }
  
//updates info to be ready to fed into and then calls up the function which creates the pie chart
async function fetchAndCalculateSkillTotals() {
    try {
      const skillsData = await fetchSkillsData();
      const skillPercentages = calculateSkillTotals(skillsData);

      const updatedSkillPercentages = Object.keys(skillPercentages).reduce((acc, key) => {
        const updatedKey = key.replace('skill_', ''); // Remove the 'skill_' prefix
        acc[updatedKey] = skillPercentages[key];
        return acc;
      }, {});

      createPieChart(updatedSkillPercentages);
      
    } catch (error) {
      console.error('Error during skill data processing:', error);
    }
  }

// Helper function to describe a path for an SVG arc all mathematical to create the segments
function describeArc(x, y, radius, startAngle, endAngle) {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
      
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      
        const d = [
          "M", start.x, start.y,
          "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
          "L", x, y,
          "Z"
        ].join(" ");
      
        return d;
      }
      
    
// Helper function to convert polar coordinates to Cartesian coordinates again all mathematical to create the segments
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180.0);
        return {
          x: centerX + (radius * Math.cos(angleInRadians)),
          y: centerY + (radius * Math.sin(angleInRadians))
        };
      }
      
//creates the pie chart and accompanying legend
function createPieChart(skillPercentages) {

        //checks my data is an object
        if (typeof skillPercentages !== 'object') {
          console.error("Input is not an object.");
          return;
        }
      
        //declares variables from object
        const percentages = Object.values(skillPercentages);
        const skillNames = Object.keys(skillPercentages);
      
        const total = percentages.reduce((sum, percentage) => sum + percentage, 0);
        let startAngle = 0;
      
        //creates svg container and sets dimensions
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = "svgContainer1"; 
        svg.setAttribute("width", "500"); // Increased width to accommodate the legend
        svg.setAttribute("height", "400");
        svg.style.margin = "auto";
      
        const radius = 100;
        const legendX = 250; // X-coordinate for the legend

        //sets colours for chart
        const skillColors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"];
      
        percentages.forEach((percentage, index) => {
          const sliceAngle = (percentage / total) * 360;
      
          // Create pie chart segment using helper functions
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute(
            "d",
            describeArc(150, 150, radius, startAngle, startAngle + sliceAngle)
          );
          path.setAttribute("fill", skillColors[index]);
          svg.appendChild(path);
      
          startAngle += sliceAngle;
        });

        //set space between chart and legend
        const legendSpacing = 50;
      
        // Create legend
        percentages.forEach((percentage, index) => {
          const legendRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          legendRect.setAttribute("x", legendX + legendSpacing);
          legendRect.setAttribute("y", 30 * index + legendSpacing); // Adjust spacing between legend items
          legendRect.setAttribute("width", 20); // Adjust width of legend color box
          legendRect.setAttribute("height", 15); // Adjust height of legend color box
          legendRect.setAttribute("fill", skillColors[index]);// choose colour
          svg.appendChild(legendRect);
      
          const legendLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
          legendLabel.setAttribute("x", legendX + 30 + legendSpacing); // Adjust spacing between color box and label
          legendLabel.setAttribute("y", 30 * index + 12 + legendSpacing); // Adjust vertical position of legend label
          legendLabel.textContent = `${skillNames[index]}: ${percentage.toFixed(2)}%`;
          legendLabel.setAttribute("font-size", "12");
          legendLabel.setAttribute("fill", "black");
          svg.appendChild(legendLabel);
        });
      
        //append legend to pie chart
        resultContainer.appendChild(svg);
      } 