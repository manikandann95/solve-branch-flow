import type { TFNode, TFEdge, TreeData, Category, Difficulty, NodeKind } from "./tree-types";

// Helper: builds a tree layout automatically from a nested spec.
// Each node has: kind, title, description?, and either branches (Q) or next (linear).
type Spec = {
  kind: NodeKind;
  title: string;
  description?: string;
  // linear next
  next?: Spec;
  // branches: label -> next node
  branches?: Array<{ label: string; to: Spec }>;
};

function build(root: Spec): TreeData {
  const nodes: TFNode[] = [];
  const edges: TFEdge[] = [];
  let counter = 0;
  const id = () => `n${++counter}`;

  // First pass: compute depth (y) and horizontal slot (x) with simple tree layout.
  interface Placed { node: TFNode; children: Array<{ label?: string; child: Placed }>; }

  function walk(spec: Spec, depth: number): Placed {
    const nodeId = id();
    const node: TFNode = {
      id: nodeId,
      type: "tf",
      position: { x: 0, y: depth * 180 },
      data: {
        kind: spec.kind,
        title: spec.title,
        description: spec.description,
      },
    };
    const children: Array<{ label?: string; child: Placed }> = [];
    if (spec.branches) {
      for (const b of spec.branches) children.push({ label: b.label, child: walk(b.to, depth + 1) });
    } else if (spec.next) {
      children.push({ child: walk(spec.next, depth + 1) });
    }
    return { node, children };
  }

  // Layout: assign x based on leaf order.
  function layout(placed: Placed, xOffset: { v: number }): number {
    if (placed.children.length === 0) {
      placed.node.position.x = xOffset.v * 320;
      xOffset.v += 1;
      return placed.node.position.x;
    }
    const childXs = placed.children.map((c) => layout(c.child, xOffset));
    const min = Math.min(...childXs);
    const max = Math.max(...childXs);
    placed.node.position.x = (min + max) / 2;
    return placed.node.position.x;
  }

  function collect(placed: Placed) {
    nodes.push(placed.node);
    for (const c of placed.children) {
      edges.push({
        id: `${placed.node.id}-${c.child.node.id}`,
        source: placed.node.id,
        target: c.child.node.id,
        label: c.label,
        animated: true,
      });
      collect(c.child);
    }
  }

  const root2 = walk(root, 0);
  layout(root2, { v: 0 });
  collect(root2);

  // Center horizontally
  const xs = nodes.map((n) => n.position.x);
  const shift = -((Math.min(...xs) + Math.max(...xs)) / 2) + 200;
  nodes.forEach((n) => (n.position.x += shift));

  return { nodes, edges };
}

// Shorthand builders
const start = (title: string, description?: string, next?: Spec): Spec => ({ kind: "start", title, description, next });
const q = (title: string, description: string, branches: Array<{ label: string; to: Spec }>): Spec => ({ kind: "question", title, description, branches });
const act = (title: string, description: string, next?: Spec): Spec => ({ kind: "action", title, description, next });
const info = (title: string, description: string, next?: Spec): Spec => ({ kind: "info", title, description, next });
const res = (title: string, description: string): Spec => ({ kind: "resolution", title, description });
const esc = (title: string, description: string): Spec => ({ kind: "escalation", title, description });

export interface Template {
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  tree: TreeData;
}

// Small helper for consistent auth issue trees
const commonLoginFlow = (): Spec =>
  q("Can the user sign in from another device?", "Rule out account-level vs device-level issue.", [
    { label: "Yes", to: q("Try incognito/private window", "Cache or extension may block sign-in.", [
      { label: "Works", to: res("Clear browser cache & cookies", "Have the user clear cached credentials, then sign in normally.") },
      { label: "Still fails", to: esc("Escalate to L2", "Device-side problem; collect HAR trace and hand off.") },
    ]) },
    { label: "No", to: act("Verify credentials in Entra portal", "Admin: check user status, MFA, and last sign-in error under Entra > Users > Sign-in logs.", esc("Escalate to Identity team", "Account-level block; involve Identity/L3.")) },
  ]);

// Template definitions
const T: Template[] = [];
function add(t: Template) { T.push(t); }

/* ==================== WINDOWS 11 ==================== */

add({
  slug: "win11-wont-boot",
  title: "PC Won't Boot / Stuck on Loading Screen",
  description: "Diagnose Windows 11 devices that fail to reach the desktop.",
  category: "windows-11", difficulty: "L1",
  tree: build(start("PC won't boot", "User reports the machine hangs before login.",
    q("Is there any display output at all?", "Distinguish hardware vs OS failure.", [
      { label: "No display", to: act("Check power & display cables", "Reseat power cable, monitor cable; try alternate monitor.",
        q("Fans spin / lights on?", "", [
          { label: "Yes", to: esc("Hardware/GPU failure — dispatch tech", "Device powers but no video; likely GPU or motherboard.") },
          { label: "No", to: esc("PSU failure — dispatch tech", "No signs of life; power supply likely dead.") },
        ])) },
      { label: "Windows logo + spinner loops", to: act("Boot into WinRE", "Force 3 failed boots (hard power off during logo) to trigger WinRE.",
        q("Try Startup Repair", "WinRE > Troubleshoot > Advanced > Startup Repair", [
          { label: "Fixed", to: res("Startup Repair resolved boot", "Document the fix and confirm normal login.") },
          { label: "Still fails", to: act("Boot to Safe Mode", "WinRE > Advanced Options > Startup Settings > Safe Mode",
            q("Boots in Safe Mode?", "", [
              { label: "Yes", to: act("Disable recent updates / drivers", "Uninstall the latest quality/feature update via WinRE > Uninstall updates.", res("Boot restored after update rollback", "Confirm normal boot; report KB to update team.")) },
              { label: "No", to: esc("Escalate for BSOD/kernel analysis", "Collect memory dump if available and hand off to L2.") },
            ])) },
        ])) },
    ]))),
});

add({
  slug: "win11-bsod",
  title: "Blue Screen of Death (BSOD) Diagnosis",
  description: "Investigate STOP codes and crash dumps on Windows 11.",
  category: "windows-11", difficulty: "L2",
  tree: build(start("Windows 11 BSOD", "Machine bugchecks and reboots.",
    act("Record the STOP code", "Ask user for the exact code (e.g. `SYSTEM_SERVICE_EXCEPTION`, `DRIVER_IRQL_NOT_LESS_OR_EQUAL`).",
      q("Is it a repeatable crash?", "", [
        { label: "On boot only", to: act("Boot into Safe Mode", "WinRE > Advanced > Safe Mode",
          q("Runs stable in Safe Mode?", "", [
            { label: "Yes", to: act("Roll back recent driver", "Device Manager > Right-click device > Properties > Driver > Roll Back.", res("Driver rollback fixed BSOD", "")) },
            { label: "No", to: esc("Kernel-level failure — collect minidump", "C:\\Windows\\Minidump; analyze with WinDbg or BlueScreenView.") },
          ])) },
        { label: "Under load / random", to: act("Run memory & disk diagnostics", "`mdsched.exe` for RAM; `chkdsk /f /r` for disk.",
          q("Errors reported?", "", [
            { label: "RAM errors", to: esc("Hardware failure — replace RAM", "") },
            { label: "Disk errors", to: esc("Hardware failure — replace drive", "Back up data first.") },
            { label: "Clean", to: act("Update chipset & GPU drivers", "Vendor site or Windows Update > Optional updates.", res("Driver update resolved BSOD", "")) },
          ])) },
      ]))
  )),
});

add({
  slug: "win11-wifi",
  title: "Wi-Fi / Network Connectivity Issues",
  description: "Restore wireless connectivity on Windows 11.",
  category: "windows-11", difficulty: "L1",
  tree: build(start("No Wi-Fi / can't reach internet", "",
    q("Is Wi-Fi adapter enabled?", "Check Quick Settings and Airplane Mode.", [
      { label: "Disabled", to: act("Enable adapter", "Settings > Network > Wi-Fi. Toggle on.", res("Wi-Fi re-enabled", "")) },
      { label: "Enabled but no SSIDs", to: act("Reset network stack", "Run as admin:\n```\nnetsh winsock reset\nnetsh int ip reset\nipconfig /release\nipconfig /renew\nipconfig /flushdns\n```", res("Network stack reset restored Wi-Fi", "Reboot to finalize.")) },
      { label: "Connected but no internet", to: q("Can you ping 8.8.8.8?", "Command Prompt: `ping 8.8.8.8`", [
        { label: "Yes", to: act("DNS issue — flush & set 1.1.1.1", "`ipconfig /flushdns` and set DNS to 1.1.1.1 / 8.8.8.8.", res("DNS reconfigured", "")) },
        { label: "No", to: esc("Escalate to network team", "Layer 3 reachability broken; likely gateway/ISP issue.") },
      ]) },
    ]))),
});

add({
  slug: "win11-windows-update",
  title: "Windows Update Failing",
  description: "Fix Windows Update errors and stuck installs.",
  category: "windows-11", difficulty: "L1",
  tree: build(start("Windows Update fails", "",
    act("Run Windows Update Troubleshooter", "Settings > System > Troubleshoot > Other > Windows Update.",
      q("Did it succeed?", "", [
        { label: "Yes", to: res("Auto-fix resolved it", "") },
        { label: "No", to: act("Reset update components", "Elevated PowerShell:\n```powershell\nStop-Service wuauserv, bits, cryptsvc\nRemove-Item C:\\Windows\\SoftwareDistribution -Recurse -Force\nRemove-Item C:\\Windows\\System32\\catroot2 -Recurse -Force\nStart-Service wuauserv, bits, cryptsvc\n```",
          q("Retry install — success?", "", [
            { label: "Yes", to: res("Components reset fixed WU", "") },
            { label: "No", to: act("Run SFC & DISM", "```\nsfc /scannow\nDISM /Online /Cleanup-Image /RestoreHealth\n```", esc("Escalate — corrupt servicing stack", "Collect `CBS.log` and `WindowsUpdate.log`.")) },
          ])) },
      ]))
  )),
});

add({
  slug: "win11-slow-pc",
  title: "Slow PC Performance",
  description: "Triage sluggish Windows 11 devices.",
  category: "windows-11", difficulty: "L1",
  tree: build(start("Slow PC", "",
    act("Open Task Manager", "Ctrl+Shift+Esc → Performance tab.",
      q("Which resource is pegged?", "", [
        { label: "CPU 100%", to: act("Sort by CPU", "Kill the offending process or restart it.", res("Runaway process handled", "Document the culprit.")) },
        { label: "Memory 90%+", to: q("Enough RAM installed?", "", [
          { label: ">= 8 GB", to: act("Close heavy apps / browser tabs", "Recommend restart if uptime > 7d.", res("Memory pressure relieved", "")) },
          { label: "< 8 GB", to: esc("Hardware upgrade recommended", "Request RAM upgrade ticket.") },
        ]) },
        { label: "Disk 100%", to: act("Check SysMain & Superfetch", "Try disabling `SysMain` service temporarily.",
          q("Improved?", "", [
            { label: "Yes", to: res("Disabled SysMain", "") },
            { label: "No", to: esc("Failing SSD/HDD suspected", "Run SMART tests.") },
          ])) },
      ]))
  )),
});

add({
  slug: "win11-printer",
  title: "Printer Not Working",
  description: "Get local or network printers back online.",
  category: "windows-11", difficulty: "L1",
  tree: build(start("Printer not working", "",
    q("Local USB or network printer?", "", [
      { label: "USB", to: act("Reseat cable & try another port", "", q("Recognized now?", "", [
        { label: "Yes", to: res("Cable/port issue resolved", "") },
        { label: "No", to: act("Reinstall driver", "Remove device, unplug, reinstall driver from vendor.", res("Driver reinstall fixed printer", "")) },
      ])) },
      { label: "Network", to: act("Ping printer IP", "",
        q("Reachable?", "", [
          { label: "Yes", to: act("Restart Print Spooler", "`net stop spooler && net start spooler`", res("Spooler restart fixed queue", "")) },
          { label: "No", to: esc("Network/DHCP issue", "Confirm printer has IP; involve network team.") },
        ])) },
    ]))),
});

add({
  slug: "win11-app-crash",
  title: "Application Crashes Repeatedly",
  description: "Diagnose a repeatedly crashing application.",
  category: "windows-11", difficulty: "L1",
  tree: build(start("App keeps crashing", "",
    act("Check Event Viewer > Application", "Look for the app name and record Faulting Module.",
      q("Which module faulted?", "", [
        { label: "App DLL", to: act("Repair / reinstall application", "Use Settings > Apps > Modify if available.", res("Reinstall fixed crash", "")) },
        { label: "OS DLL (ntdll, kernel32)", to: act("Run SFC & DISM", "```\nsfc /scannow\nDISM /Online /Cleanup-Image /RestoreHealth\n```", esc("Escalate — system corruption", "")) },
        { label: "Third-party (AV, GPU)", to: act("Update the third-party module", "", res("Updated conflicting module", "")) },
      ]))
  )),
});

add({
  slug: "win11-local-login",
  title: "User Cannot Log In (Local Account)",
  description: "Local login failures on a Windows 11 workstation.",
  category: "windows-11", difficulty: "L1",
  tree: build(start("User can't log in locally", "",
    q("Error message?", "", [
      { label: "Wrong password", to: act("Reset via another admin", "Use `net user <name> *` from elevated cmd.", res("Password reset", "")) },
      { label: "User Profile Service failed", to: act("Restore profile from backup key", "HKLM\\...\\ProfileList — rename `.bak` profile back.", res("Profile fixed", "")) },
      { label: "Account locked", to: act("Wait lockout or unlock via admin", "", res("Account unlocked", "")) },
      { label: "Other", to: esc("Escalate to L2", "") },
    ]))),
});

add({
  slug: "win11-bitlocker",
  title: "BitLocker Recovery Key Prompt",
  description: "Handle unexpected BitLocker recovery prompts.",
  category: "windows-11", difficulty: "L2",
  tree: build(start("BitLocker recovery screen at boot", "",
    act("Retrieve recovery key", "Entra ID: Users > Devices > BitLocker keys. AD: msFVE-RecoveryInformation.",
      q("Key unlocks the drive?", "", [
        { label: "Yes", to: act("Suspend & resume protection", "```powershell\nSuspend-BitLocker -MountPoint C:\nResume-BitLocker -MountPoint C:\n```", res("Recovery loop cleared", "Reboot to confirm.")) },
        { label: "No key found", to: esc("Data recovery escalation", "No key available; involve InfoSec.") },
      ]))
  )),
});

add({
  slug: "win11-usb",
  title: "USB Device Not Recognized",
  description: "Troubleshoot missing or unrecognized USB devices.",
  category: "windows-11", difficulty: "L1",
  tree: build(start("USB device not recognized", "",
    act("Try a different port and cable", "",
      q("Detected on another PC?", "", [
        { label: "Yes", to: act("Reinstall USB controllers", "Device Manager > Universal Serial Bus controllers > Uninstall > Reboot.", res("Controller reinstall fixed it", "")) },
        { label: "No", to: esc("Faulty device", "Replace the peripheral.") },
      ]))
  )),
});

/* ==================== AZURE ENTRA ID ==================== */

add({
  slug: "entra-m365-signin",
  title: "User Cannot Sign In to Microsoft 365",
  description: "Diagnose Entra sign-in failures for M365 apps.",
  category: "azure-entra", difficulty: "L1",
  tree: build(start("Cannot sign in to M365", "", commonLoginFlow())),
});

add({
  slug: "entra-mfa",
  title: "MFA Not Working / Locked Out",
  description: "Restore MFA access for locked-out users.",
  category: "azure-entra", difficulty: "L1",
  tree: build(start("MFA issue", "",
    q("What's happening?", "", [
      { label: "Not receiving push", to: act("Re-register the Authenticator", "Entra > Users > User > Authentication methods > Require re-register MFA.", res("MFA re-registered", "")) },
      { label: "Locked out (no methods)", to: act("Reset methods as admin", "Entra portal > Authentication methods > Delete all → user re-registers on next sign-in.", res("Methods reset", "")) },
      { label: "Number matching fails", to: info("Explain new number-match UX", "User must type the number shown on the sign-in screen into Authenticator.", res("User educated", "")) },
    ]))),
});

add({
  slug: "entra-ca-blocked",
  title: "Conditional Access Policy Blocking Access",
  description: "Diagnose CA-blocked sign-ins.",
  category: "azure-entra", difficulty: "L2",
  tree: build(start("CA policy blocks user", "",
    act("Open Sign-in Logs > Failed", "Entra > Monitoring > Sign-in logs > Filter user + failure.",
      q("Which policy fired?", "", [
        { label: "Require compliant device", to: act("Check device compliance in Intune", "", esc("Involve endpoint team if non-compliant", "")) },
        { label: "Block legacy auth", to: act("Move user to modern-auth client", "", res("Modern-auth client fixed it", "")) },
        { label: "Trusted location required", to: act("Whitelist or VPN in", "", res("Access via trusted network", "")) },
      ]))
  )),
});

add({
  slug: "entra-guest",
  title: "Guest User Access Issues",
  description: "External/guest user cannot access shared resources.",
  category: "azure-entra", difficulty: "L2",
  tree: build(start("Guest can't access resource", "",
    q("Did the guest accept the invite?", "", [
      { label: "No", to: act("Resend invite", "Entra > Users > New guest user > Resend.", res("Invite resent", "")) },
      { label: "Yes", to: q("Cross-tenant access configured?", "", [
        { label: "No", to: act("Configure cross-tenant access", "Entra > External Identities > Cross-tenant access settings.", res("Cross-tenant enabled", "")) },
        { label: "Yes", to: esc("Escalate — check CA + licensing", "") },
      ]) },
    ]))),
});

add({
  slug: "entra-sspr",
  title: "Self-Service Password Reset (SSPR) Failure",
  description: "User cannot reset password via SSPR.",
  category: "azure-entra", difficulty: "L1",
  tree: build(start("SSPR fails for user", "",
    q("SSPR enabled for their group?", "", [
      { label: "No", to: act("Add user to SSPR-enabled group", "", res("SSPR enabled", "")) },
      { label: "Yes", to: q("User has 2 registered methods?", "", [
        { label: "No", to: act("Have user register methods", "https://aka.ms/mfasetup", res("Methods registered", "")) },
        { label: "Yes", to: esc("Check password writeback (Entra Connect)", "") },
      ]) },
    ]))),
});

add({
  slug: "entra-connect-sync",
  title: "Azure AD Sync Errors (Entra Connect)",
  description: "Investigate directory sync issues from on-prem AD to Entra ID.",
  category: "azure-entra", difficulty: "L2",
  tree: build(start("Entra Connect sync errors", "",
    act("Open Synchronization Service Manager", "Check Operations tab for the last failed run and its error.",
      q("Error type?", "", [
        { label: "Duplicate attribute", to: act("Resolve duplicate proxyAddress/UPN", "Use `Get-ADUser -Filter` to find conflicts.", res("Conflict resolved", "")) },
        { label: "Stopped-extension-dll-exception", to: esc("Reinstall Entra Connect", "") },
        { label: "Rate limit / throttle", to: info("Wait & rerun delta", "`Start-ADSyncSyncCycle -PolicyType Delta`", res("Sync recovered", "")) },
      ]))
  )),
});

add({
  slug: "entra-app-registration",
  title: "App Registration / Enterprise App Issues",
  description: "Diagnose failing OAuth/SAML apps.",
  category: "azure-entra", difficulty: "L2",
  tree: build(start("App SSO fails", "",
    q("Protocol?", "", [
      { label: "SAML", to: act("Verify reply URL & cert", "Enterprise Apps > App > Single sign-on. Confirm ACS URL and signing cert.",
        q("Cert expired?", "", [
          { label: "Yes", to: act("Roll new signing cert", "", res("New SAML cert deployed", "")) },
          { label: "No", to: esc("Compare SAML trace with vendor", "") },
        ])) },
      { label: "OAuth/OIDC", to: act("Check redirect URI & consent", "App registration > Authentication + API permissions.",
        q("Admin consent granted?", "", [
          { label: "No", to: act("Grant admin consent", "", res("Consent granted", "")) },
          { label: "Yes", to: esc("Trace with `Get-MgAuditLog`", "") },
        ])) },
    ]))),
});

add({
  slug: "entra-license",
  title: "License Assignment Problems",
  description: "User missing an M365 license or license conflict.",
  category: "azure-entra", difficulty: "L1",
  tree: build(start("License issue", "",
    q("Assigned via group or direct?", "", [
      { label: "Group", to: act("Check group license errors", "Entra > Groups > License errors.", res("Group license fixed", "")) },
      { label: "Direct", to: act("Check available licenses", "Entra > Billing > Licenses.",
        q("Any available?", "", [
          { label: "Yes", to: act("Reassign license", "", res("License assigned", "")) },
          { label: "No", to: esc("Purchase / reclaim licenses", "") },
        ])) },
    ]))),
});

/* ==================== WINDOWS SERVER ==================== */

add({
  slug: "server-unreachable",
  title: "Server Unreachable / Cannot RDP",
  description: "Cannot RDP to a Windows Server.",
  category: "windows-server", difficulty: "L1",
  tree: build(start("Cannot RDP to server", "",
    q("Can you ping the server?", "", [
      { label: "Yes", to: q("Port 3389 open?", "`Test-NetConnection <server> -Port 3389`", [
        { label: "Yes", to: act("Restart RDP service via WinRM", "```powershell\nInvoke-Command -ComputerName <server> -ScriptBlock { Restart-Service TermService -Force }\n```", res("RDP service restarted", "")) },
        { label: "No", to: act("Check firewall on server", "", esc("Involve server admin", "")) },
      ]) },
      { label: "No", to: act("Check console via iLO/iDRAC/vSphere", "", esc("Server down — dispatch on-call", "")) },
    ]))),
});

add({
  slug: "server-disk-full",
  title: "Disk Space Full on Server",
  description: "Reclaim space on a full server volume.",
  category: "windows-server", difficulty: "L1",
  tree: build(start("Server disk full", "",
    act("Identify large folders", "```powershell\nGet-ChildItem C:\\ -Recurse -ErrorAction SilentlyContinue |\n  Sort-Object Length -Descending | Select -First 20\n```",
      q("Which is largest?", "", [
        { label: "WinSxS", to: act("Run DISM cleanup", "`DISM /Online /Cleanup-Image /StartComponentCleanup`", res("WinSxS reduced", "")) },
        { label: "IIS/App logs", to: act("Rotate & archive logs", "", res("Logs archived", "")) },
        { label: "Windows Update cache", to: act("Delete SoftwareDistribution\\Download", "Stop wuauserv first.", res("WU cache cleared", "")) },
        { label: "User data / DB", to: esc("Coordinate with app owner", "") },
      ]))
  )),
});

add({
  slug: "server-service-not-starting",
  title: "Windows Service Not Starting",
  description: "A critical Windows service fails to start.",
  category: "windows-server", difficulty: "L2",
  tree: build(start("Service won't start", "",
    act("Check Event Viewer > System", "Locate the service failure entry and error code.",
      q("Error type?", "", [
        { label: "Dependency failed", to: act("Start dependencies first", "`Get-Service <svc> -RequiredServices | Start-Service`", res("Dependencies started", "")) },
        { label: "Access denied", to: act("Reset service account password", "", res("Credentials fixed", "")) },
        { label: "Binary missing / corrupt", to: esc("Repair application", "") },
      ]))
  )),
});

add({
  slug: "server-dns",
  title: "DNS Resolution Failures",
  description: "Server or clients cannot resolve names.",
  category: "windows-server", difficulty: "L2",
  tree: build(start("DNS resolution failing", "",
    act("Nslookup a known-good record", "`nslookup contoso.com`",
      q("Resolves externally but not internally?", "", [
        { label: "Yes", to: act("Check conditional forwarders", "DNS Manager > Conditional Forwarders.", res("Forwarder fixed", "")) },
        { label: "No", to: act("Verify DNS service", "`Get-Service DNS; ipconfig /flushdns`",
          q("Fixed?", "", [
            { label: "Yes", to: res("Service/cache issue", "") },
            { label: "No", to: esc("Zone corruption — check AD-integrated zones", "") },
          ])) },
      ]))
  )),
});

add({
  slug: "server-dhcp-exhaust",
  title: "DHCP Scope Exhausted",
  description: "Clients cannot obtain an IP address.",
  category: "windows-server", difficulty: "L2",
  tree: build(start("Clients not getting IPs", "",
    act("Open DHCP Manager > scope", "Check % used.",
      q("Scope > 90%?", "", [
        { label: "Yes", to: act("Extend scope or reduce lease", "Reduce from 8d to 1d during triage; expand range if possible.", res("Scope extended", "")) },
        { label: "No", to: q("Rogue DHCP suspected?", "", [
          { label: "Yes", to: act("Locate rogue via `dhcploc`", "", esc("Involve network team", "")) },
          { label: "No", to: esc("Check helper addresses on switches", "") },
        ]) },
      ]))
  )),
});

add({
  slug: "server-cert-expiry",
  title: "Certificate Expiry Issues",
  description: "TLS/service certificate has expired.",
  category: "windows-server", difficulty: "L2",
  tree: build(start("Cert expiry causing failures", "",
    act("Identify expiring cert", "```powershell\nGet-ChildItem Cert:\\LocalMachine\\My |\n  Where NotAfter -lt (Get-Date).AddDays(30)\n```",
      q("Renewal source?", "", [
        { label: "Internal PKI", to: act("Renew via `certreq -renew`", "", res("Cert renewed & bound", "")) },
        { label: "Public CA", to: act("Request new cert from CA", "", res("New cert deployed", "")) },
      ]))
  )),
});

add({
  slug: "server-event-log",
  title: "Event Log Error Investigation",
  description: "Investigate a recurring Event Log error.",
  category: "windows-server", difficulty: "L2",
  tree: build(start("Recurring event log error", "",
    act("Identify Event ID and source", "`Get-WinEvent -MaxEvents 50 -LogName System`",
      q("Known error pattern?", "", [
        { label: "Yes (documented KB)", to: act("Apply KB fix", "", res("KB applied", "")) },
        { label: "No", to: esc("Escalate with export of last 24h logs", "") },
      ]))
  )),
});

add({
  slug: "server-perf",
  title: "Server Performance Degradation",
  description: "Server responding slowly or intermittently.",
  category: "windows-server", difficulty: "L2",
  tree: build(start("Server slow", "",
    act("Open Performance Monitor", "Baseline CPU, Memory, Disk queue, Network.",
      q("Bottleneck?", "", [
        { label: "CPU", to: act("Identify top process (`Get-Process | sort CPU -desc`)", "", res("Process contained", "")) },
        { label: "Memory pressure", to: act("Check for memory leak or add RAM", "", esc("Involve app team if leak", "")) },
        { label: "Disk queue > 2", to: esc("Storage bottleneck — SAN/RAID review", "") },
      ]))
  )),
});

/* ==================== ACTIVE DIRECTORY ==================== */

add({
  slug: "ad-locked-out",
  title: "User Account Locked Out",
  description: "AD account keeps getting locked.",
  category: "active-directory", difficulty: "L1",
  tree: build(start("Account locked out", "",
    act("Find source of lockout", "```powershell\nSearch-ADAccount -LockedOut\n# Then on PDC emulator:\nGet-WinEvent -FilterHashtable @{LogName='Security';Id=4740} -MaxEvents 5\n```",
      q("Source device known?", "", [
        { label: "Known user device", to: act("Clear cached creds & update password on device", "Credential Manager, Outlook profile, mapped drives.", res("Stale creds cleared", "")) },
        { label: "Server / service", to: act("Update service account password everywhere", "", res("Service creds updated", "")) },
      ]))
  )),
});

add({
  slug: "ad-password",
  title: "Password Reset / Expiry Issues",
  description: "AD password reset or expiry problems.",
  category: "active-directory", difficulty: "L1",
  tree: build(start("Password issue", "",
    q("Issue?", "", [
      { label: "User forgot password", to: act("Reset via ADUC / PowerShell", "`Set-ADAccountPassword -Identity <user> -Reset`", res("Password reset", "")) },
      { label: "Password expired", to: act("Reset & force change at logon", "", res("Reset with force change", "")) },
      { label: "Fails complexity", to: info("Explain policy", "Min 12 chars, upper+lower+digit+symbol (per policy).", res("User educated", "")) },
    ]))),
});

add({
  slug: "ad-gpo",
  title: "Group Policy Not Applying",
  description: "GPOs not applying to a user or computer.",
  category: "active-directory", difficulty: "L2",
  tree: build(start("GPO not applying", "",
    act("Run gpresult", "`gpresult /h C:\\gpresult.html` and inspect Denied GPOs.",
      q("Filtered / denied why?", "", [
        { label: "Security filtering", to: act("Fix group membership or add security group", "", res("Filtering corrected", "")) },
        { label: "WMI filter", to: act("Validate WMI query on target", "", res("WMI filter fixed", "")) },
        { label: "Slow link / async", to: act("`gpupdate /force` and reboot", "", res("Policy applied", "")) },
      ]))
  )),
});

add({
  slug: "ad-replication",
  title: "Replication Failures Between DCs",
  description: "Domain controllers not replicating.",
  category: "active-directory", difficulty: "L2",
  tree: build(start("DC replication failing", "",
    act("Run repadmin", "`repadmin /replsummary` and `repadmin /showrepl`",
      q("Error?", "", [
        { label: "1722 RPC unavailable", to: act("Check firewall / DNS between DCs", "", esc("Involve network team", "")) },
        { label: "8606 insufficient attrs", to: esc("Lingering objects — clean with repadmin /removelingeringobjects", "") },
        { label: "Access denied", to: act("Verify computer account / secure channel", "`Test-ComputerSecureChannel -Repair`", res("Secure channel repaired", "")) },
      ]))
  )),
});

add({
  slug: "ad-domain-join",
  title: "Cannot Join PC to Domain",
  description: "Domain join fails.",
  category: "active-directory", difficulty: "L1",
  tree: build(start("Domain join fails", "",
    q("Error message?", "", [
      { label: "DNS name does not exist", to: act("Point to internal DNS", "Configure NIC DNS to DC IPs.", res("DNS fixed", "")) },
      { label: "Access denied", to: act("Use a delegated account", "Or add computer object in ADUC first.", res("Join succeeded", "")) },
      { label: "Time skew", to: act("Sync time with DC", "`w32tm /resync`", res("Time synced", "")) },
    ]))),
});

add({
  slug: "ad-ou-delegation",
  title: "OU / Permission Delegation Issues",
  description: "Delegated admin cannot manage objects.",
  category: "active-directory", difficulty: "L2",
  tree: build(start("Delegated admin blocked", "",
    act("Review OU ACLs", "ADUC > OU > Properties > Security > Advanced.",
      q("Missing needed permission?", "", [
        { label: "Yes", to: act("Run Delegation of Control Wizard", "", res("Delegation granted", "")) },
        { label: "No — inherited deny", to: esc("Escalate to AD architect", "") },
      ]))
  )),
});

add({
  slug: "ad-trust",
  title: "Trust Relationship Broken",
  description: "PC shows 'trust relationship between this workstation and primary domain failed'.",
  category: "active-directory", difficulty: "L1",
  tree: build(start("Trust relationship broken", "",
    act("Repair secure channel", "Sign in as local admin, then:\n```powershell\nTest-ComputerSecureChannel -Repair -Credential (Get-Credential)\n```",
      q("Repaired?", "", [
        { label: "Yes", to: res("Secure channel restored", "Reboot and confirm domain login.") },
        { label: "No", to: act("Rejoin domain", "Remove from domain to WORKGROUP, reboot, rejoin.", res("Rejoined domain", "")) },
      ]))
  )),
});

add({
  slug: "ad-fsmo",
  title: "FSMO Role Holder Issues",
  description: "FSMO role holder is offline or misplaced.",
  category: "active-directory", difficulty: "L2",
  tree: build(start("FSMO issue", "",
    act("List FSMO holders", "`netdom query fsmo`",
      q("Holder online?", "", [
        { label: "Yes", to: info("Roles are healthy", "Consider transferring for balance.", res("No action needed", "")) },
        { label: "No — planned migration", to: act("Transfer roles", "`Move-ADDirectoryServerOperationMasterRole -Identity <dc> -OperationMasterRole ...`", res("Roles transferred", "")) },
        { label: "No — DC is dead", to: act("Seize roles (last resort)", "`Move-ADDirectoryServerOperationMasterRole -Force`", esc("Coordinate with AD team before seizing", "")) },
      ]))
  )),
});

export const TEMPLATES = T;
