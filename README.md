# **WhatsApp Logger**

Quick ```node``` script to log outgoing and incoming messages using ```puppeteer``` by creating screenshots of each message for easy backtracking.

## **Environment variables**
**WhatsApp Logger** is only able to log one chat at a time. To log a chat, enter the search query in the ```CHAT``` env variable. It is advised to input mobile numbers since multiple matches might not log the desired chat.
```bash
# Example used is a dutch phone number
CHAT=+31 6 12345678
```

## **Folders**

    .
    ├── data                    # Browser data
    │   ├── userdata            # Headless driver user data
    ├── logs                    # Logging by winston, has info logs by date/time
    │   ├── error               # Error logs
    ├── screenshots             # Screenshots saved per chat
    └── ...
