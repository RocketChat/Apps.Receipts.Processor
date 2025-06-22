<div align="center">
<img width=30% src="https://github.com/user-attachments/assets/a92f27b9-5101-4725-8311-a0e6ada0edc7" alt="chat-summarizer-illustration">
</div>

<h1 align="center">Rocket.Chat Receipt Processor App</h1>

We’ve all wasted hours squinting at crumpled receipts and battling spreadsheets. With the AI Receipts Processor, manual expense tracking becomes obsolete. This app transforms piles of receipts into organized reports with AI-powered precision.

<div align="center">
    <img width=60% src="https://github.com/user-attachments/assets/50c511e5-9e55-4618-95e6-a42720a41595">
</div>

<h2>Features 🚀</h2>
<ul>
  <li>Scan and store expense data from receipt sent via images</li> 
  <li>Data can be grouped according to user by using channels</li>
  <li>Create comprehensive, customizable reports segmented by group, time period, or individual user.</li>
  <li>Support custom LLM selection</li>
  <li>Detect and block malicious prompt injection</li>
</ul>

<h2 >How to set up 💻</h2>
<ol>
  <li>Have a Rocket.Chat server ready. If you don't have a server, see this <a href="https://docs.rocket.chat/docs/deploy-rocketchat">guide</a>.</li> 
  <li style="margin-bottom: 1rem;">Install the Rocket.Chat Apps Engine CLI. </li>

```
npm install -g @rocket.chat/apps-cli
```

Verify if the CLI has been installed

```
rc-apps -v
```

  <li style="margin-bottom: 1rem;">Clone the GitHub Repository</li>
    
```
git clone https://github.com/RocketChat/Apps.Receipts.Processor.git
```
  
<li style="margin-bottom: 1rem;">Install app dependencies</li>
  
```
cd Apps.Receipts.Processor/app
yarn install
```
  
  <li style="margin-bottom: 1rem;">Deploy the app to the rocket chat server </li>
  
  ```
  cd app
  rc-apps deploy --url <server_url> --username <username> --password <password>
  ```
  or 
  ```
  make deploy url=<URL> username=<USERNAME> password=<PASSWORD>
  ```
  
  - If you are running the server locally, the default `server_url` is http://localhost:3000.
  - `username` is the username of your admin user.
  - `password` is the password of your admin user.
</ol>

<h2>Usage 💬</h2>

- **`/receipt list`**: Display all your receipt records.
- **`/receipt room`**: Display your receipt records specific to the current room or channel.
- **`/receipt date`**: Display your receipt records from the current room or channel within a specified date range.
- **`/receipt help`**: Show all available receipt commands.

<h2>🧑‍💻 Contributing</h2>
Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue.
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: adds some amazing feature'`)
4. Push to the Branch (`git push origin feat/AmazingFeature`)
5. Open a Pull Request
