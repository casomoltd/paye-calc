// Every gate this repo configures, one key each: `privateRefs` for
// check-private-refs.
const config = {
  // This repo is public, so it is checked without asking `gh`.
  privateRefs: {visibility: 'public'},
};

export default config;
