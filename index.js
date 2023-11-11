const fetch = require('node-fetch');
const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');
require('dotenv').config();
const URL = process.env.URL;

const randomColor = () => {
    const colorCodes = [chalk.red, chalk.green, chalk.yellow, chalk.blue, chalk.magenta, chalk.cyan, chalk.white];
    return colorCodes[Math.floor(Math.random() * colorCodes.length)];
};

const coloredBanner = (text) => {
    return randomColor()(text);
};

const checkApiKey = async (apiKey) => {
    const url = `${URL}auth?api=${apiKey}`;
    const response = await fetch(url, { method: 'POST' });

    if (response.status === 200) {
        const data = await response.json();
        if (data.error) {
            return null;
        }
        return data;
    }
    return null;
};

const checkActiveServices = async (apiKey) => {
    const url = `${URL}services?api=${apiKey}`;
    const response = await fetch(url, { method: 'POST' });

    if (response.status === 200) {
        const data = await response.json();
        if (data.error) {
            return null;
        }
        return data;
    }
    return null;
};

const setupConfig = async () => {
    if (fs.existsSync('config.json')) {
        const config = readConfig();
        const apiKey = config.api_key;
        const apiData = await checkApiKey(apiKey);

        if (apiData) {
            console.log(coloredBanner(`
            ______ _______ __   _ _______  _____  _______ _     _ _______ _______ _     _ _______  ______
            |  ____ |______ | \\  |    |    |     | |       |_____| |______ |       |____/  |______ |_____/
            |_____| |______ |  \\_|    |    |_____| |_____  |     | |______ |_____  |    \\_ |______ |    \\_
            `));
            console.log("Your API Key: ", apiKey);
            console.log("Username: ", apiData.username);
            console.log("Credit: ", apiData.credit);
            checker(apiKey);
        } else {
            console.log("Invalid API Key. Deleting config.");
            await sleep(2000);
            console.log("Restart in 5 seconds");
            await sleep(5000);
            fs.unlinkSync('config.json');
            await setupConfig();
        }
    } else {
        console.log(coloredBanner(`
        ______ _______ __   _ _______  _____  _______ _     _ _______ _______ _     _ _______  ______
        |  ____ |______ | \\  |    |    |     | |       |_____| |______ |       |____/  |______ |_____/
        |_____| |______ |  \\_|    |    |_____| |_____  |     | |______ |_____  |    \\_ |______ |    \\_
        `));
        console.log("GENTO CHECKER CLI PYTHON");
        console.log("Please Setup Your Config\n");

        const apiKey = await getInput("Api Key: ");
        const apiData = await checkApiKey(apiKey);

        if (apiData) {
            const config = { api_key: apiKey };
            fs.writeFileSync('config.json', JSON.stringify(config));

            console.log("SETUP SUCCESS RESTARTING SCRIPT.....");
            await sleep(5000);
            console.clear()
            await setupConfig();
        } else {
            console.log("Invalid API Key.");
            await sleep(2000);
            console.log("Restarting Script in 5 seconds");
            await sleep(5000);
            await setupConfig();
        }
    }
};

const readConfig = () => {
    if (!fs.existsSync('config.json')) {
        console.log("config.json is not setup yet. Please setup.");
        process.exit(1);
    }

    const configData = fs.readFileSync('config.json', 'utf-8');
    return JSON.parse(configData);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getInput = (prompt) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(prompt, answer => {
            rl.close();
            resolve(answer);
        });
    });
};

const checker = async (apiKey) => {
    console.log("Checking active services...");
    await sleep(2000);
    const config = readConfig();
    const apiData = await checkActiveServices(apiKey);

    if (apiData) {
        const services = (apiData.CCC || []).concat(apiData.braintree || []);

        console.log("Active Services:");
        services.forEach((service, index) => {
            console.log(`${index + 1}. ${service.name}`);
        });

        const selectedServiceIndex = await getInput(`Chose service (1-${services.length}): `);
        const selectedServiceNumber = parseInt(selectedServiceIndex);

        if (isNaN(selectedServiceNumber) || selectedServiceNumber < 1 || selectedServiceNumber > services.length) {
            console.log("Invalid selection.");
            return;
        }

        const selectedService = services[selectedServiceNumber - 1];
        console.log(`You Chose ${selectedService.name}`);
        const gateId = selectedService.gateid;

        const ccFiles = fs.readdirSync('.').filter(file => file.endsWith('.txt'));
        if (ccFiles.length === 0) {
            console.log("There is no .txt file available for use.");
            return;
        }

        console.log("Select Your list to use:");
        ccFiles.forEach((file, index) => {
            console.log(`${index + 1}. ${file}`);
        });

        const selectedFileIndex = await getInput(`Pilih file.txt (1-${ccFiles.length}): `);
        const selectedFileNumber = parseInt(selectedFileIndex);

        if (isNaN(selectedFileNumber) || selectedFileNumber < 1 || selectedFileNumber > ccFiles.length) {
            console.log("Invalid list.");
            return;
        }

        const selectedFile = ccFiles[selectedFileNumber - 1];
        const ccs = fs.readFileSync(selectedFile, 'utf-8').split('\n');

        for (const cc of ccs) {
            const ccTrimmed = cc.trim();
            const url = `${URL}checker?api=${apiKey}&gate=${gateId}&cc=${ccTrimmed}`;
            const response = await fetch(url, { method: 'POST' });

            const data = await response.json();
            const status = data.status;

            if (status === "DECLINED") {
                const message = `DECLINED =>: ${ccTrimmed} - ${data.brand} - ${data.level} - ${data.type} - ${data.bank} - ${data.country} - Credit: ${data.credit} - REASON: ${data.reason} - ${data.chekcedon}`;
                console.log(chalk.red(message));
                fs.appendFileSync("declined.txt", message + "\n");
            } else if (status === "Approved") {
                const message = `APPROVED => ${ccTrimmed} - ${data.brand} - ${data.level} - ${data.type} - ${data.bank} - ${data.country} - Credit: ${data.credit} - ${data.chekcedon}`;
                console.log(chalk.green(message));
                fs.appendFileSync("approved.txt", message + "\n");
            } else if (status === "RECHECK") {
                const message = `RECHECK => ${ccTrimmed} - REASON: ${data.reason}`;
                console.log(chalk.yellow(message));
                fs.appendFileSync("recheck.txt", message + "\n");
            } else if (status === "EXPIRED") {
                const message = `EXPIRED CARD => ${ccTrimmed}`;
                console.log(chalk.red(message));
                fs.appendFileSync("expired.txt", message + "\n");
            } else {
                const message = `UNKNOWN => ${ccTrimmed}`;
                console.log(chalk.yellow(message));
                fs.appendFileSync("unknown.txt", message + "\n");
            }
        }
    } else {
        console.log("Invalid API Key. Deleting config.");
        await sleep(2000);
        console.log("Restart in 5 seconds");
        await sleep(5000);
        fs.unlinkSync('config.json');
    }
};

setupConfig();
