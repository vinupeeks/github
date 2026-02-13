// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';


const { spawn } = require('child_process');
const which = require('which');

async function callPythonScript(filename) {
  return new Promise((resolve, reject) => {
    try {
      let pythonExecutable = which.sync('python3');
      const pythonProcess = spawn(pythonExecutable, ['./app/helper/pdf_reader.py', `./files/pdf/${filename}`]);

      let outputBuffer = '';

      pythonProcess.stdout.on('data', (data) => {
        outputBuffer += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`Error from Python: ${data.toString()}`);
      });

      pythonProcess.on('exit', (code) => {
        if (code === 0) {
          const page2Match = outputBuffer.match(/\[PAGE2_START\]([\s\S]*?)\[PAGE2_END\]/);
          const jsonMatch = outputBuffer.match(/\[JSON_SAVED_TO\] (.+)/);

          const page2Text = page2Match ? page2Match[1].trim() : null;
          const jsonFilePath = jsonMatch ? jsonMatch[1].trim() : null;

          resolve({ page2Text, jsonFilePath });
        } else {
          reject(new Error(`Python script exited with code ${code}`));
        }
      });
    } catch (error) {
      console.error('Error finding Python executable or running script:', error);
      reject(error);
    }
  });
}

module.exports = callPythonScript;
