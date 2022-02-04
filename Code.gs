// Sometime non-spam emails end up in spam and often it is too clogged up to really notice it, 
// so filtering it out some is an helpful process. As such, this "Google App Scripts" filters
// the SPAM folder for known/100% sure "it is spam" to automatically label it out of spam 
// (using user defined label(s) that you can check), mark it as read and delete it.
// 
// This is a "Google Apps Scripts" script that uses Gmail,
// It runs on Google servers at the interval you set 

// Take a look at making this "quickstart" operational will go a great way to make this one work
// see https://developers.google.com/gmail/api/quickstart/apps-script
//
// In order to use this script, you need to have Gmail push content to SPAM: 
// 1) Make use of the "Report Spam" and the "Block" sender (which sends to spam) 
//    function available to you and built into Gmail.
// 2) Figure out the DKIM-Signature / Message-ID / From that you need to filter.
//    Using the "Show Original" from Gmail's message dropdown is helpful to do so
// 3) Add it to each search arrays in the "User Customization (2/2)" section
//    - using RegExp following https://support.google.com/a/answer/1371415?hl=en
//    - always escape using \\
// 4) Make sure to create any "_label" in Gmail or you will have an error 
//    (see "User Customization (1/2)" section)
// 5) Run it on "SPAM" by using the "main" function and check the logs
//    from the script editor, "Run -> Run Function -> main"
//    then "View -> Logs"
// 6) Recommended: Add a time based trigger to run "main" automatically 
//    (like every 10-60 minutes or so). For more details, see
//    https://developers.google.com/apps-script/guides/triggers/installable
//
//   Keep in mind that the tool will only read the "top" maxthread at a time, 
//   so manual cleanup of the leftover every so often will be benefitial

///// User Customization -- BEGIN

var debug = false; // Print a lot more info for each run, available from "View -> Logs"
var verb = true; // Give more details about what was done for each run
var doit = true; // Perform the tagging/deletion/mark read steps
var maxthread=100; // Maximum number of messages to read per run

//////////

// Make sure to create all the "_label" labels in Gmail before trying those

// Regexp https://support.google.com/a/answer/1371415?hl=en
// and always use \\

// Main label: apply two labels to each spam: easy to find + why it was sorted
var main_label = "misc/autodeleted_spam"
// Note: If you do not want to know the filter used, simply replace all _label entries below with main_label
// Example: mid_label = main_label;


// Recommendations: 
// - Sort by TLD, will make it easier to find similar entries later
// - Entries are added in arrays (comma separated). Use one entry per line for readibility. Only the last entry will not need a comma
// - Entries are passed as regular expressions. \\ escape non alpha-numerical characters ( @ - . etc)
//     Example: in From: block all subdomains of baddomain.badtld: '\\@.+\\.baddomain\\.badtld'
// - Use caution when using negative look ahead on text : (?!text)
//     test at https://regex101.com/ -- ECMAScript (Javascript)
// - Find the appropriate match based on the type of search based on the user@tld note below, not all of it is needed, just realize this is a regular expression match
// - Actual filters values are placed in in their own .gs files (make sure to "move file up" so it is loaded first), directly inside arrays
//     Example: mid_domains = [ 'baddomain1\\.badtld1', 'baddomain2\\.badtld2'];
// - When you add new rules, it is recommended to set doit to false (and turn debug to true) and test it


// Message-ID
var mid_label = "misc/autodeleted_spam_mid";
// Message-ID:
// matches: ...@tld>
// ** copy/uncomment/adapt the following 4 lines in a set_mid_domains.gs Script file (part of the same Project, make sure they it is "move file up" above this Script file)
//var mid_domains = [ 
//  'baddomain1\\.badtld1',
//  'baddomain2\\.badtld2' 
//];


// DKIM-Signature (often seen in "sent via")
var via_label = "misc/autodeleted_spam_via";
// DKIM-Signature:
// matches: d=tld;
// OR if DKIM is empty
// Received-SPF:
// ** copy/uncomment/adapt the following 4 lines in a set_via_domains.gs Script file (part of the same Project, make sure they it is "move file up" above this Script file)
//var via_domains = [ 
//  '.+\\.badtld1', // Careful: Full TLD
//  'baddomain2\\.badtld2' 
//];


// From
var from_label = "misc/autodeleted_spam_from";
// From:
// matches: Name <user@tld> OR user@tld
// ** copy/uncomment/adapt the following 10 lines in a set_from_tofilter.gs Script file (part of the same Project, make sure they it is "move file up" above this Script file)
//var from_tofilter = [
//  '\\.tld\\>', // Full TLD filter
//  '\\@value\\..+', // value.alldomain.alltld
//  'KnownSpammerName\\@.+', // KnownSpammerName@* filter
//  'user\\@domain\\.tld', // user@domain.tld
//  '\\@.+\\.domain\\.tld', // *.domain.tld
//  '\\.domain\\.tld', // domain.tld in any part of the field
//  '\\domain\\.(tld1|tld2)', // domain.tld1 and domain.tld2
//  'UniqueText.+\\<.+', // UniqueText in the name/text section of the email
//];


// Subject
var subj_label = "misc/autodeleted_spam_subj";
// Subject:
// matches the actual regexp written below, use with caution
// have to escpae \ : \s as to be written \\s
// ** copy/uncomment/adapt the following 4 lines in a set_subj_tofilter.gs Script file (part of the same Project, make sure they it is "move file up" above this Script file)
//var subj_tofilter = [
//  'WordToFilter', // Use with caution
//  'Sentence to filter'
//];

// X-Campaign
var xc_label = "misc/autodeleted_spam_xc";
// X-Campaign:
// matches the actual regexp written below, use with caution
// ** copy/uncomment/adapt the following 3 lines in a set_subj_tofilter.gs Script file (part of the same Project, make sure they it is "move file up" above this Script file)
//var xc_tofilter = [
//  '^value$' // match value exactly
//];


// To
var to_label = "misc/autodeleted_spam_to";
// To:
// matches the actual regexp written below, use with caution
// ** copy/uncomment/adapt the following 4 lines in a set_to_tofilter.gs Script file (part of the same Project, make sure they it is "move file up" above this Script file)
//var to_tofilter = [
//  'user@domain.told', // Filter known forwards
//  'user+bad@domain.told' // Filter known + adds
//];


// Received (using xc label)
var received_label = "misc/autodeleted_spam_recv";
// Received:
// matches the actual regexp written below, use with caution
// ** copy/uncomment/adapt the following 3 lines in a set_received_tofilter.gs Script file (part of the same Project, make sure they it is "move file up" above this Script file)
//var received_tofilter = [
//  'from\\sdomain\\.tld' // Powerful as it can block domain.tld when it is only shown in that field
//];

///// User Customization -- END

///////////// 

function filter_getThreads(inlabel, ntodo) {
  // inlabel: label to search for
  // ntodo: number of threads to return
  var threads;
  
  if (inlabel == "inbox") {
    threads = GmailApp.getInboxThreads(0, ntodo);
  } else if (inlabel == "spam") {
    threads = GmailApp.getSpamThreads(0, ntodo);
  } else {
    var wlabel = GmailApp.getUserLabelByName(inlabel);
    // get all threads from label
    threads = wlabel.getThreads(0, ntodo);
  }
  Logger.log("[INFO] Label: %s | Found %d threads", inlabel, threads.length);

  return(threads);
}

///////////// 

// Message-ID:
function filter_mid(message) {
  // Process Message-ID: 
  var mid = message.getHeader("Message-ID");
  if (debug)
    Logger.log("[DEBUG]++ \"Message-ID\": %s (%d to check)", mid, mid_domains.length);
  
  for (var k = 0; k < mid_domains.length; k++) {
    var b = mid_domains[k];

    if (debug)
      Logger.log("[DEBUG] Search: %s", b);

    // ...@tld>
    var regex = new RegExp(".+" + b + "\>", 'gim');
    var does_match = regex.test(mid);
    
    if (does_match) {
      if (verb)
        Logger.log("[MATCH] \"Message-ID\" Match: %s", b);
      return(true)
    }
  }
  return(false);
}

/////

// Received-SPF:
// ARC-Authentication-Results:
function filter_via_spf_core(message, htm) {
  // Process Received-SPF: 
  var spf = message.getHeader(htm);
  if (debug)
    Logger.log("[DEBUG]++ \"%s\": %s (%d to check)", htm, spf, via_domains.length);
  
  if (spf == "")
    return(false);
  
  for (var k = 0; k < via_domains.length; k++) {
    var b = via_domains[k];

    if (debug)
      Logger.log("[DEBUG] Search: %s", b);
    
    // ... domain of user@tld designates
    var regex = new RegExp(b + " designates", 'gim');
    var does_match = regex.test(spf);
    
    if (does_match) {
      if (verb)
        Logger.log("[MATCH] \"SPF\" (%s) Match: %s (%s)", htm, b, spf);
      return(true)
    }
  }
  return(false);
}

//

function filter_via_spf(message) {
  // Process Received-SPF: or ARC-Authentication-Results:
  // Sometime this header is available multiple time, so also using ARC-Authentication-Results (contains the same string)
  it=filter_via_spf_core(message, 'Received-SPF');
  if (it)
    return(true);

  return(filter_via_spf_core(message, 'ARC-Authentication-Results'))
}

/////

// DKIM-Signature:
function filter_via_dkim(message) {
  // Process DKIM-Signature: 
  var dkim = message.getHeader("DKIM-Signature");
  if (dkim == "")
    return(false);
  
  if (debug)
    Logger.log("[DEBUG]++ \"DKIM-Signature\": %s (%d to check)", dkim, via_domains.length);
  
  for (var k = 0; k < via_domains.length; k++) {
    var b = via_domains[k];

    if (debug)
      Logger.log("[DEBUG] Search: %s", b);
    
    // ... d=tld;
    var regex = new RegExp(".+d\=" + b + "\;", 'gim');
    var does_match = regex.test(dkim);
    
    if (does_match) {
      if (verb)
        Logger.log("[MATCH] \"DKIM\" Match: %s (%s)", b, dkim);
      return(true)
    }
  }
  return(false);
}

// VIA handler
function filter_via(message) {
  it=filter_via_dkim(message);
  if (it)
    return(true);

  return(filter_via_spf(message));
}

/////

// From:
function filter_from(message) {
  // Process From: 
  var from = message.getFrom();
  if (debug)
    Logger.log("[DEBUG]++ \"From\" \[%s\] (%d to check)", from, from_tofilter.length);

  for (var k = 0; k < from_tofilter.length; k++) {
    var b = from_tofilter[k];

    if (debug)
      Logger.log("[DEBUG] Search: %s", b);
 
    // Name <user@tld> OR user@tld
    var regex = new RegExp("^.*" + b + "\>?$", 'gim');
    var does_match = regex.test(from);
    
    if (does_match) {
      if (verb)
        Logger.log("[MATCH] \"From\" Match : %s (%s)", b, from);
      return(true)
    }
  }
  return(false);
}

/////

function filter_common(message, header, current_tofilter) {
  var hv = message.getHeader(header);
  
  if (hv == "")
    return(false);

  if (debug)
    Logger.log("[DEBUG]++ \"%s\" \[%s\] (%d to check)", header, hv, current_tofilter.length);
  
  for (var k = 0; k < current_tofilter.length; k++) {
    var b = current_tofilter[k];

    if (debug)
      Logger.log("[DEBUG] \"%s\" Search: %s", header, b);

    // Regexp seach    
    var regex = new RegExp(b, 'gim');
    var does_match = regex.test(hv);
    
    if (does_match) {
      if (verb)
        Logger.log("[MATCH] \"%s\" Match : %s (%s)", header, b, hv);
      return(true)
    }
  }

  return(false);
}

/////

function filter_match_all(message) {
  // removed raw header content: can be obtained using get_rawcontent(message)

  if (filter_mid(message)) {
    return(mid_label);
  }

  if (filter_via(message)) {
    return(via_label);
  }
  
  if (filter_from(message)) {
    return(from_label);
  }

  if (filter_common(message, "Subject", subj_tofilter)) {
    return(subj_label);
  }
  
  if (filter_common(message, "X-Campaign", xc_tofilter)) {
    return(xc_label);
  }

  if (filter_common(message, "To", to_tofilter)) {
    return(to_label);
  }

  if (filter_common(message, 'Received', received_tofilter)) {
    return(received_label)
  }

  return("");
}

/////////////

function get_rawcontent(message) {
  // get the Raw content of the message
  var trcontent = message.getRawContent();
  // we consider the email header to be 4K at max
  var rcontent = tcontent.substring(0, Math.min(4096,tcontent.length));

  return(rcontent);
}

/////

function filterAll(inlabel, ntodo) {
  // inlabel: label to search for
  // ntodo: number of threads to return
  var mlabel = GmailApp.getUserLabelByName(main_label)

  var threads = filter_getThreads(inlabel, ntodo);
  var ttodo = threads.length;
  var tfound = 0;
  
  for (var i = 0; i < threads.length; i++) {
    Utilities.sleep(10);
    
    // get the first messages in a given thread: we are trying to apply a label, so it will apply to the entire thread
    var message = threads[i].getMessages()[0];

    var subject = message.getSubject();
    var from = message.getFrom();
    if (verb)
      Logger.log("[VERB] Subject: [%s] | From: [%s]", subject, from);
    
    // Let's see if there is a match (and which outlabel to work with)
    var outlabel = filter_match_all(message);
    if (debug)
      Logger.log("[DEBUG] Outlabel: %s", outlabel);
    
    // For any match: apply the "outlabel" and "move it to trash"
    if (outlabel != "") {
      var dlabel = GmailApp.getUserLabelByName(outlabel);
      tfound++;
      
      Logger.log("[MATCH] InLabel: %s | OutLabel: %s | Subject: %s", inlabel, outlabel, subject);
      // Apply label to thread
      if (doit) {
        mlabel.addToThread(threads[i]);
        dlabel.addToThread(threads[i]);

        // Actions on individual messages (if more than one in thread)
        var messages = threads[i].getMessages();
        for (var j = 0; j < messages.length; j++) {
          // Mark as Read
          messages[j].markRead();
          // Delete the Message
          messages[j].moveToTrash();
        } // for (j
      } // if (doit
    } // if (outlabel 
  } // for (i
  
  return([ttodo, tfound]);
}

/////////////
// MAIN
/////////////

function main () {
  var total = 0;
  var found = 0;
  
  // Duplicate this block to have it work on other folders 
  var a = filterAll("spam", maxthread);
  total += a[0];
  found += a[1];
  
  Logger.log("[INFO] Done [%d seen / %d match]", total, found);
}

///// EOF