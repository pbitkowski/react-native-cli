/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs';
import minimist from 'minimist';
import path from 'path';
import process from 'process';
import printRunInstructions from '../generator/printRunInstructions';
import { createProjectFromTemplate } from '../generator/templates';
import PackageManager from '../util/PackageManager';
import logger from '../util/logger';

/**
 * Creates the template for a React Native project given the provided
 * parameters:
 * @param projectDir Templates will be copied here.
 * @param argsOrName Project name or full list of custom arguments
 *                   for the generator.
 * @param options Command line options passed from the react-native-cli directly.
 *                E.g. `{ version: '0.43.0', template: 'navigation' }`
 */
function init(projectDir, argsOrName) {
  const args = Array.isArray(argsOrName)
    ? argsOrName // argsOrName was e.g. ['AwesomeApp', '--verbose']
    : [argsOrName].concat(process.argv.slice(4)); // argsOrName was e.g. 'AwesomeApp'

  // args array is e.g. ['AwesomeApp', '--verbose', '--template', 'navigation']
  if (!args || args.length === 0) {
    logger.error('react-native init requires a project name.');
    return;
  }

  const newProjectName = args[0];
  const options = minimist(args);

  logger.info(`Setting up new React Native app in ${projectDir}`);
  generateProject(projectDir, newProjectName, options);
}

/**
 * Generates a new React Native project based on the template.
 * @param Absolute path at which the project folder should be created.
 * @param options Command line arguments parsed by minimist.
 */
function generateProject(destinationRoot, newProjectName, options) {
  // eslint-disable-next-line import/no-unresolved
  const reactNativePackageJson = require('react-native/package.json');
  const { peerDependencies } = reactNativePackageJson;
  if (!peerDependencies) {
    logger.error(
      "Missing React peer dependency in React Native's package.json. Aborting."
    );
    return;
  }

  const reactVersion = peerDependencies.react;
  if (!reactVersion) {
    logger.error(
      "Missing React peer dependency in React Native's package.json. Aborting."
    );
    return;
  }

  const packageManager = new PackageManager({
    projectDir: destinationRoot,
    forceNpm: options.npm,
  });

  createProjectFromTemplate(
    destinationRoot,
    newProjectName,
    options.template,
    destinationRoot
  );

  logger.info('Adding required dependencies');
  packageManager.install([`react@${reactVersion}`]);

  logger.info('Adding required dev dependencies');
  packageManager.installDev([
    '@babel/core',
    '@babel/runtime',
    'jest',
    'babel-jest',
    'metro-react-native-babel-preset',
    `react-test-renderer@${reactVersion}`,
  ]);

  addJestToPackageJson(destinationRoot);
  printRunInstructions(destinationRoot, newProjectName);
}

/**
 * Add Jest-related stuff to package.json, which was created by the react-native-cli.
 */
function addJestToPackageJson(destinationRoot) {
  const packageJSONPath = path.join(destinationRoot, 'package.json');
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath));

  packageJSON.scripts.test = 'jest';
  packageJSON.jest = {
    preset: 'react-native',
  };
  fs.writeFileSync(
    packageJSONPath,
    `${JSON.stringify(packageJSON, null, 2)}\n`
  );
}

export default init;
