import puppeteer from 'puppeteer'
import moment from 'moment'
import winston from 'winston'
import 'dotenv/config'
import { mkdir } from 'fs/promises'

declare var process : {
  env: {
    CHAT: string
  }
}

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


function wait(delay: number) {

    return new Promise(r => setTimeout(r, delay));
}

(async () => {
    logger.info("Starting browser")
    const browser = await puppeteer.launch({
        userDataDir: 'userData',
        // headless: false
        // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    })

    logger.info("Opening page")
    const qrPage = await browser.newPage()
    await qrPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3641.0 Safari/537.36')
    await qrPage.goto(`https://web.whatsapp.com`)
    // await qrPage.waitForFunction(() => !document.querySelector('[data-testid="wa-web-loading-screen"]'))
    await qrPage.waitForFunction(() => !document.querySelector('html')?.classList.contains('no-js'))

    /**
     * Check if WhatsApp is logged in, 
     * otherwise wait for QR code to be scanned
     */

    const landing = await qrPage.$('.landing-main')
    
    if (landing != null) {
      await qrPage.waitForSelector(`[data-testid="qrcode"]`, {
        timeout: 0
      })
      await qrPage.screenshot({
        path: `qr-${date()}.png`
      })
      await qrPage.waitForFunction(() => !document.querySelector(".landing-main"), {
        timeout: 0
      })
    }

    await qrPage.waitForSelector("#side", {
      timeout: 0
    }).then(() => {
        logger.info("Successfully loaded WhatsApp!")
    })

    await qrPage.close()

    logger.info("Opening page")
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3641.0 Safari/537.36')
    await page.goto(`https://web.whatsapp.com`)

    await page.waitForSelector("#side", {
      timeout: 0
    }).then(() => {
        logger.info("Successfully loaded WhatsApp!")
    })

    await page.focus('[title="Search input textbox"]')
    await page.keyboard.type(process.env.CHAT)

    const chat = await page.waitForSelector('[role="grid"] [role="listitem"]')
    let label: string | null | undefined;
    await chat?.click().then(async () => {
        let el = await page.$('[role="grid"] [role="listitem"] span')
        label = await page.evaluate(element => element?.textContent, el)
        logger.info(`opened chat ${label}`)
    }).then(async () => {
        let dir = `./screenshots/${label?.toLowerCase()}`
        await mkdir(dir)
    }).catch((e) => logger.error(e))

    const chatPanel = await page.waitForSelector('[data-testid="conversation-panel-wrapper"]')
    chatPanel?.scrollIntoView()

    await page.setViewport({
        width: 412,
        height: 883
    })

    await wait(2000)

    logger.info("Listening to new messages")

    const messageCallback = async (message: any) => {
      await mkdir(`./screenshots/${label?.toLowerCase()}`, {
        recursive: true
      })

      await page.screenshot({
        path: `./screenshots/${label?.toLowerCase()}/${date()}.png`
      }).then(() => logger.info("Screenshotted new message!"))

      logger.info(message)
    }

    await page.exposeFunction('messageCallback', messageCallback)

    await page.evaluate(async () => {
      const target = document.querySelector(`[role="application"]`)

      const observer = new MutationObserver(async (messages) => {
        for (let message of messages) {
          if (message.type === 'childList') {
            await messageCallback(message)
          }
        }
      })

      observer.observe(target!, {
        childList: true
      })
    })
})()