const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const _ = require('lodash');

function sleep(n) {
    return new Promise(resolve => setTimeout(resolve, n));
}

/**
 *
 * @param driver {Driver}
 * @param cb
 */
function registerEventListener(driver, cb) {
    setInterval(async () => {
        const els = await driver.findElements(webdriver.By.className('selenium-event'));
        for (let i = 0; i < els.length; i++) {
            const el = els[i];
            let message = await el.getText();
            let id = await el.getAttribute('id');
            removeElement(driver, id);
            cb(JSON.parse(message));
        }
    }, 500);
}

/**
 *
 * @param driver {Driver}
 * @param id
 */
function removeElement(driver, id) {
    driver.executeScript(`
    const [id] = arguments;
    document.getElementById(id).className = 'removed';//remove(); 
    `, id);
}

async function spawnMessage(driver, msg) {
    function eventCreator(msg) {
        return `
        const msg = document.createElement('div');
        msg.textContent = 'Message: ${msg}';
        document.body.appendChild(msg);
        `;
    }

    return await driver.executeScript(eventCreator(msg));
}

/**
 *
 * @param driver {WebDriver}
 * @param map
 */
async function registerEventWriter(driver, map) {
    function eventCreator(map) {
        let s = `
        let counter = 0;
        const evContainer = document.createElement('div');
        document.body.appendChild(evContainer);
        const f = function(e) {
            // Create the map function from the passed in callback 
            const mapFunction = ${map.toString()};
            // Use the map result, as well as another filter variable
            const [passed, result] = mapFunction(e);
            if (!passed) {
                return;
            }
            const el = document.createElement('div');
            el.id = \`selenium-event-\${counter}\`;
            counter++;
            el.className = 'selenium-event';
            el.style = 'top: -1000';
            // el.hidden = true;
            // el.style = 'opacity: 0.1;/**/'
            // TODO how to hide it without opacity
            el.textContent = JSON.stringify(result, null, '\t');
            evContainer.appendChild(el);
        };
        
        document.body.onclick = f;
        document.body.onkeydown = f;
        document.body.onkeyup = f;
        `;
        return s;
    }

    return await driver.executeScript(eventCreator(map));
}


async function test() {
    const d = new webdriver.Builder()
        .forBrowser('chrome')
        .build();
    await d.get('http://localhost:8080');
    try {
        registerEventWriter(d, defaultFunc);
        registerEventListener(d, data => {
            // This should be an object, or a json string
            console.log(data);
        })
    } catch (e) {
        console.error(e);
    } finally {
        await sleep(10000);
    }
    await registerEventWriter(d);
}

/**
 *
 * @param e {Event}
 */
function defaultFunc(e) {
    return [
        // The first return result is whether we should create an event for this function
        true,
        // The second event is what information will be in the event
        {
            timestamp: e.timeStamp,
            targetId: e.srcElement.id,
            targetClass: e.srcElement.classList
        }
    ]
}

function go(driver, listener, handler) {
    registerEventListener(driver, listener);
    registerEventWriter(driver, handler);
}

module.exports = {
    registerEventWriter,
    registerEventListener,
    go,
    test
};




