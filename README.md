# v2f is a virtual U2F device for you to study & hack

This project is still in its pre-alpha stage.  It is recommended that you run
v2f inside a virtual machine.

v2f works on Ubuntu 16.04 with Google Chrome.  Actually v2f should work on any
Linux distribution which exposes its user-space HID ABI through `/dev/uhid`.

Please be noted that any software emulation of a security device, especially
when it runs completely in the user-space, is NOT "secure" for serious use
cases.

---

Clone this source code repository

```bash
git clone https://github.com/concise/v2f-nodejs-linux
cd v2f-nodejs-linux
```

Optionally patch the permissions for `/dev/uhid` and `/dev/hidraw*`

```bash
sudo bash patch-linux-permission
```

Run v2f (CTRL-C to exit)

```bash
node main.js
```

By default v2f store secret key information and authentication counter under
the directory `~/.v2f` you can change that

```bash
node main.js path/to/my-custom-v2f-directory
V2FPATH=path/to/my-custom-v2f-directory node main.js
```

---

### Some URLs

- https://github.com/torvalds/linux/blob/master/Documentation/hid/uhid.txt
- https://fidoalliance.org/specs/fido-u2f-v1.0-nfc-bt-amendment-20150514/fido-u2f-hid-protocol.html
- https://fidoalliance.org/specs/fido-u2f-v1.0-nfc-bt-amendment-20150514/fido-u2f-raw-message-formats.html
- https://nodejs.org/docs/latest-v6.x/api/crypto.html
