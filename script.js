// async function fetchData() {
//   const loginRes = await fetch("http://localhost:3000/api/session", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify({
//       username: "vanshikasoni468@gmail.com",
//       password: "@vanshika22"
//     })
//   });

//   const loginData = await loginRes.json();
//   const token = loginData.id;

//   console.log("Token:", token);

//   const res = await fetch("http://localhost:3000/api/card/1/query", {
//     headers: {
//       "X-Metabase-Session": token
//     }
//   });

//   const data = await res.json();
//   console.log("Data:", data);
// }

// fetchData();
// const res = await fetch("http://localhost:3000/public/question/62f29651-4ca0-4cdb-a779-0095b1f1d264?format=json");
// const data = await res.json();

// console.log(data);
// const API_URL = "http://localhost:3000/public/question/62f29651-4ca0-4cdb-a779-0095b1f1d264?format=json";

// async function fetchData() {
//   try {
//     const res = await fetch(API_URL);
//     const data = await res.json();

//     console.log("Fetched Data:", data);
//   } catch (error) {
//     console.error("Error fetching data:", error);
//   }
// }

// fetchData();
// const API_URL = "http://localhost:3000/public/question/62f29651-4ca0-4cdb-a779-0095b1f1d264.json?format=rows";

// async function fetchData() {
//   try {
//     const res = await fetch(API_URL, {
//       headers: {
//         "Accept": "application/json"
//       }
//     });

//     const data = await res.json();

//     console.log("Fetched Data:", data);
//   } catch (error) {
//     console.error("Error fetching data:", error);
//   }
// }

// fetchData();
const API_URL = "http://localhost:3000/public/question/62f29651-4ca0-4cdb-a779-0095b1f1d264.json?format=rows";

async function fetchData() {
  try {
    const res = await fetch(API_URL);
    let data = await res.json();


    data = data.filter(item =>
      item["User ID"].toLowerCase().includes("john")
    );

    data = data.filter(item =>
      item["Total ($)"] > 100
    );
    data = data.filter(item =>
      item["Quantity"] > 2
    );
    data = data.sort((a, b) => b["Total ($)"] - a["Total ($)"]);

    displayData(data);

  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

function displayData(data) {
  const container = document.getElementById("data");
  container.innerHTML = ""; // clear old data

  data.slice(0, 50).forEach(item => {
    const div = document.createElement("div");

    div.innerHTML = `
      <p>
        User: ${item["User ID"]} |
        Product: ${item["Product ID"]} |
        Total: ${item["Total ($)"]} |
        Quantity: ${item["Quantity"]}
      </p>
    `;

    container.appendChild(div);
  });
}

fetchData();