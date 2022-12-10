const express = require("express");
const app = express();
app.use(express.json());

const path = require("path");
let dbPath = path.join(__dirname, "covid19IndiaPortal.db");

const sqlite = require("sqlite");
const { open } = sqlite;
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
let db;

let initializeDBServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, (request, response) => {
      console.log("Server running at http://Localhost/3000/");
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
initializeDBServer();
////////////////////
let AuthenticateToket = (request, response, next) => {
  let jwtToken = request.headers["authorization"];
  if (jwtToken !== undefined) {
    jwtToken = jwtToken.split(" ")[1];
    jsonwebtoken.verify(
      jwtToken,
      "NaveenKumarNuthalapati",
      async (error, payLoad) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          request.username = payLoad.username;
          next();
        }
      }
    );
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};
////////////////////
app.post("/register/", async (request, response) => {
  let { username, password } = request.body;
  let user = `SELECT * FROM user where username = '${username}'`;
  user = await db.get(user);
  if (user === undefined) {
    let hashedPassword = await bcrypt.hash(password, 10);
    let insertQuery = `INSERT INTO user (username,password)
                                VALUES('${username}','${hashedPassword}')`;
    await db.run(insertQuery);
  } else {
    response.status(400);
    response.send("User Already Exists");
  }
});
///////////////////
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  let user = `SELECT * FROM user WHERE username = '${username}'`;
  user = await db.get(user);
  if (user !== undefined) {
    let comparePass = await bcrypt.compare(password, user.password);
    if (comparePass === true) {
      let payLoad = { username: username };
      let jwtToken = await jsonwebtoken.sign(payLoad, "NaveenKumarNuthalapati");

      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});
///////////////////
app.get("/states/", AuthenticateToket, async (request, response) => {
  let countries = `select state_id as stateId, state_name as stateName, population from state;`;
  countries = await db.all(countries);
  response.status(200);
  response.send(countries);
});

app.get("/states/:stateId/", AuthenticateToket, async (request, response) => {
  let { stateId } = request.params;
  let state = `SELECT state_id as stateId,
                          state_name as stateName, population from state
                          WHERE state_id = ${stateId};`;
  state = await db.get(state);
  response.status(200);
  response.send(state);
});
//////////////////
app.post("/districts/", AuthenticateToket, async (request, response) => {
  try {
    let { districtName, stateId, cases, cured, active, deaths } = request.body;
    let insertQuery = `INSERT INTO district (district_name, state_id, cases, cured, active,deaths)
                        VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths})`;
    await db.run(insertQuery);
    response.status(200);
    response.send("District Successfully Added");
  } catch (error) {
    console.log(error);
  }
});

/////////////////
app.delete(
  "/districts/:districtId/",
  AuthenticateToket,
  async (request, response) => {
    let { districtId } = request.params;
    let deleteQery = `DELETE FROM district WHERE district_id = ${districtId};`;
    await db.run(deleteQery);
    response.status(200);
    response.send("District Removed");
  }
);
/////////////////
app.put(
  "/districts/:districtId/",
  AuthenticateToket,
  async (request, response) => {
    let { districtId } = request.params;

    let { districtName, stateId, cases, cured, active, deaths } = request.body;
    console.log(districtName);
    let putQuery = `UPDATE district SET 
                      district_name = '${districtName}',
                      state_id = ${stateId},
                      cases = ${cases},
                      cured = ${cured},
                      active = ${active},
                      deaths = ${deaths}
                      WHERE district_id = ${districtId};`;
    await db.run(putQuery);
    response.send("District Details Updated");
  }
);
/////////////////
app.get(
  "/districts/:districtId/",
  AuthenticateToket,
  async (request, response) => {
    try {
      let { districtId } = request.params;
      let district = `SELECT district_id as districtId,
                        district_name as districtName,
                        state_id as stateId,
                        cases,cured,active,deaths
FROM district WHERE district_id = ${districtId};`;
      district = await db.get(district);
      response.status(200);
      response.send(district);
    } catch (error) {
      console.log(error);
    }
  }
);

app.get(
  "/states/:stateId/stats/",
  AuthenticateToket,
  async (request, response) => {
    let { stateId } = request.params;
    dis_stat = `SELECT sum(cases) as totalCases,
                         sum(cured) as totalCured,
                         sum(active) as totalActive,
                         sum(deaths) as totalDeaths
     FROM district WHERE state_id = ${stateId};`;
    dis_stat = await db.get(dis_stat);
    response.status(200);
    response.send(dis_stat);
  }
);
module.exports = app;
