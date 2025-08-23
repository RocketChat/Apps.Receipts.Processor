<div align="center">
<img width=30% src="https://github.com/user-attachments/assets/a92f27b9-5101-4725-8311-a0e6ada0edc7" alt="chat-summarizer-illustration">
</div>

<h1 align="center">Rocket.Chat Receipt Processor App</h1>

<p>We’ve all wasted hours squinting at crumpled receipts and battling spreadsheets. With the AI Receipts Processor, manual expense tracking becomes obsolete. This app transforms piles of receipts into organized reports with AI-powered precision.</p>

<div align="center">
    <img width=60% src="https://github.com/user-attachments/assets/50c511e5-9e55-4618-95e6-a42720a41595">
</div>

<h2>Features 🚀</h2>
<ul>
  <li>Scan and store expense data from receipts sent via images</li> 
  <li>Data can be grouped according to user by using channels or threads</li>
  <li>Create comprehensive reports segmented by categories and time periods</li>
  <li>Support custom LLM selection</li>
  <li>Detect and block malicious prompt injection</li>
</ul>

<h2>How to set up 💻</h2>
<ol>
  <li>Have a Rocket.Chat server ready. If you don't have a server, see this <a href="https://docs.rocket.chat/docs/deploy-rocketchat">guide</a>.</li> 
  <li>Install the Rocket.Chat Apps Engine CLI:</li>

<pre>
npm install -g @rocket.chat/apps-cli
</pre>

<p>Verify if the CLI has been installed:</p>
<pre>
rc-apps -v
</pre>

  <li>Clone the GitHub Repository:</li>
<pre>
git clone https://github.com/RocketChat/Apps.Receipts.Processor.git
</pre>
  
  <li>Install app dependencies:</li>
<pre>
cd Apps.Receipts.Processor/app
yarn install
</pre>
  
  <li>Deploy the app to the Rocket.Chat server:</li>
<pre>
cd app
rc-apps deploy --url &lt;server_url&gt; --username &lt;username&gt; --password &lt;password&gt;
</pre>
  <p>or</p>
<pre>
make deploy url=&lt;URL&gt; username=&lt;USERNAME&gt; password=&lt;PASSWORD&gt;
</pre>
  
  <ul>
    <li>If you are running the server locally, the default <code>server_url</code> is <code>http://localhost:3000</code>.</li>
    <li><code>username</code> is the username of your admin user.</li>
    <li><code>password</code> is the password of your admin user.</li>
  </ul>
  <br>
  <li><b>Open the App Settings</b> by navigating to <code>Administration &gt; Marketplace &gt; Private Apps</code>.  
  You should see the app listed there. Click on the app name to open it, then go to <b>Settings</b> and add your LLM provider configuration.</li>
</ol>

<h2>Usage 💬</h2>

<h3>Slash Commands</h3>
<ul>
  <li><b><code>/receipt list</code></b>: Display all your receipt records.</li>
  <li><b><code>/receipt room</code></b>: Display your receipt records specific to the current room or channel.</li>
  <li><b><code>/receipt date YYYY-MM-DD</code></b>: Display your receipt records for a specific date.</li>
  <li><b><code>/receipt date from YYYY-MM-DD to YYYY-MM-DD</code></b>: Display your receipt records within a specified date range.</li>
  <li><b><code>/receipt spending_report</code></b>: Generate a spending report for all receipts in the current room.</li>
  <li><b><code>/receipt spending_report category &lt;category&gt;</code></b>: Generate a spending report for a specific category.</li>
  <li><b><code>/receipt help</code></b>: Show all available receipt commands.</li>
</ul>

<h3>Natural Language Queries (AI-powered)</h3>
<p>You can now simply type what you want in plain English — no need to remember exact commands by tagging the bot, Here are some examples:</p>
<ul>
  <li><b>View receipts</b></li>
  <ul>
    <li>"@receipt-bot, Show me my receipts"</li>
    <li>"@receipt-bot, List all receipts in this room"</li>
    <li>"@receipt-bot, Display receipts from yesterday"</li>
    <li>"@receipt-bot, Show receipts from 2024-07-01 to 2024-07-31"</li>
  </ul>
  <li><b>Thread-specific</b></li>
  <ul>
    <li>"@receipt-bot, Show receipts in this thread"</li>
    <li>"@receipt-bot, List my receipts in this thread"</li>
  </ul>
  <li><b>Reports</b></li>
  <ul>
    <li>"@receipt-bot, Generate a spending report for last month"</li>
    <li>"@receipt-bot, Create a report for groceries from 2024-07-01 to 2024-07-31"</li>
    <li>"@receipt-bot, Show my total spending for July"</li>
  </ul>
  <li><b>Channel management</b></li>
  <ul>
    <li>"@receipt-bot, Add this channel"</li>
    <li>"@receipt-bot, Register this room for receipt tracking"</li>
  </ul>
  <li><b>Help</b></li>
  <ul>
    <li>"@receipt-bot, Help"</li>
    <li>"@receipt-bot, What can you do?"</li>
  </ul>
</ul>

<h2>🧑‍💻 Contributing</h2>
<p>Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are <b>greatly appreciated</b>.</p>

<p>If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue. Don't forget to give the project a star! Thanks again!</p>

<ol>
  <li>Fork the Project</li>
  <li>Create your Feature Branch (<code>git checkout -b feat/AmazingFeature</code>)</li>
  <li>Commit your Changes (<code>git commit -m 'feat: adds some amazing feature'</code>)</li>
  <li>Push to the Branch (<code>git push origin feat/AmazingFeature</code>)</li>
  <li>Open a Pull Request</li>
</ol>
