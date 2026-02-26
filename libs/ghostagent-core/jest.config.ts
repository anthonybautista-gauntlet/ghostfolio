/* eslint-disable */
export default {
  displayName: 'ghostagent-core',
  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/ghostagent-core',
  preset: '../../jest.preset.js'
};
