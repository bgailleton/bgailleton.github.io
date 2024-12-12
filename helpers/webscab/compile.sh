# asc grid.ts --outFile webscab.wasm --exportRuntime

asc --config asconfig.json

cp ./webscab.wasm ../../static/widgets/webscab/
cp ./*.js ../../static/widgets/webscab/

