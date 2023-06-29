import puppeteer from 'puppeteer'
import moment from 'moment'
import winston from 'winston'
import 'dotenv/config'
import { mkdir } from 'fs/promises'

const date = () => {
    let currentDate = moment().unix()
    return moment.unix(currentDate).format("DD-MM-YYYY-HH:mm:ss")
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({
            filename: `./logs/error/error-${date()}.log`,
            level: 'error'
        }),
        new winston.transports.File({
            filename: `./logs/info-${date()}.log`
        })
    ]
})


function wait(delay) {
    return new Promise(r => setTimeout(r, delay));
}
(async () => {
    logger.info("Starting browser")
    const qrBrowser = await puppeteer.launch({
        headless: false,
        userDataDir: 'data/userdata'
        // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    })

    logger.info("Opening page")
    const qrPage = await qrBrowser.newPage()
    await qrPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3641.0 Safari/537.36')
    await qrPage.goto(`https://web.whatsapp.com`)
    await qrPage.waitForFunction(() => !document.querySelector('[data-testid="wa-web-loading-screen"]'))

    /**
     * Check if WhatsApp is logged in, 
     * otherwise wait for QR code to be scanned
     */
    await wait(5000)

    while(true) {
        const landing = await qrPage.$('.landing-main')
        if (landing == null) break
    }

    await qrBrowser.close()

    const browser = await puppeteer.launch({
        // headless: false,
        userDataDir: 'data/userdata'
        // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    })

    logger.info("Opening page")
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3641.0 Safari/537.36')
    await page.goto(`https://web.whatsapp.com`)

    await page.waitForSelector("#side").then(() => {
        logger.info("Successfully loaded WhatsApp!")
    })

    await page.focus('[title="Search input textbox"]')
    await page.keyboard.type(process.env.CHAT)

    const chat = await page.waitForSelector('[role="grid"] [role="listitem"]')
    let label;
    await chat.click().then(async () => {
        let el = await page.$('[role="grid"] [role="listitem"] span')
        label = await page.evaluate(element => element.textContent, el)
        logger.info(`opened chat ${label}`)
    }).then(async () => {
        let dir = `./screenshots/${label.toLowerCase()}`
        await mkdir(dir)
    }).catch((e) => logger.error(e))

    const chatPanel = await page.waitForSelector('[data-testid="conversation-panel-wrapper"]')
    chatPanel.scrollIntoView()

    await page.setViewport({
        width: 412,
        height: 883
    })

    await wait(2000)

    let messageCount = await page.evaluate(e => {
        return document.querySelectorAll(`[data-testid="conversation-panel-wrapper"] [role="row"]:not(:has([data-testid="msg-notification-container"]))`).length
    })

    logger.info("Listening to new messages")

    while(true) {
        let messageLength = await page.evaluate(e => {
            return document.querySelectorAll(`[data-testid="conversation-panel-wrapper"] [role="row"]:not(:has([data-testid="msg-notification-container"]))`).length
        })
        
        if (messageCount < messageLength) {
            await page.screenshot({
                path: `./screenshots/${label.toLowerCase()}/${date()}.png`
            }).then(() => logger.info("Screenshotted new message!"))
            messageCount = messageLength
        }

        await wait(200)
    }
})()