# Gmail Spam Cleaner
(originaly stored as a gist)

Sometime non-spam emails end up in spam and often it is too clogged up to really notice it, 
so filtering it out some is an helpful process. As such, this "Google App Scripts" filters
the SPAM folder for known/100% sure "it is spam" to automatically label it out of spam 
(using user defined label(s) that you can check), mark it as read and delete it.

This is a "Google Apps Scripts" script that uses Gmail,
It runs on Google servers at the interval you set 
Take a look at making this "quickstart" operational will go a great way to make this one work
see https://developers.google.com/gmail/api/quickstart/apps-script

In order to use this script, you need to make sure to have Gmail push content to SPAM: 
1. Make use of the "Report Spam" and the "Block" sender (which sends to spam) function available to you and built into Gmail.
2. Figure out the DKIM-Signature / Message-ID / From that you need to filter. Using the "Show Original" from Gmail's message dropdown is helpful to do so.
3. Add it to each search arrays in the "User Customization" section of the code
   - using RegExp following https://support.google.com/a/answer/1371415?hl=en
   - always escape using \\
4. Make sure to create any "_label" in Gmail or you will have an error (see "User Customization" section of the code)
5. Run it on "SPAM" by using the "main" function and check the log from the script editor, `Run -> Run Function -> main` then `View -> Logs`
6. Recommended: Add a time based trigger to run `main` automatically (like every 10-60 minutes or so). For more details, see https://developers.google.com/apps-script/guides/triggers/installable
   - Keep in mind that the tool will only read the "top" maxthread at a time, so manual cleanup of the leftover every so often will be benefitial

The "User Customization" content is detailed further in the `.gs` file 

You will need to create a new project in https://script.google.com/ and authorize it to access your gmail; some of those steps are described in https://developers.google.com/gmail/api/quickstart/apps-script
