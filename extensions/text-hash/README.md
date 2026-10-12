# Text Hash

The SHA-256, SHA-1, SHA-512 or MD5 of a text as a card while you type, computed on this Mac.

## Type

- “sha256 hello”
- “md5 hello world”
- “sha1 abc”

The text after the algorithm (quotes taken off) is hashed as UTF-8 with node:crypto, on this Mac: SHA-256, SHA-1, SHA-512 or MD5, in hex. MD5 and SHA-1 are marked as unfit for security. ↵ copies the whole hash.

## Reaches

Nothing: it is computed on your Mac. It changes nothing.
