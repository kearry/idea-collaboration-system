module.exports = {
  extends: [
    'react-app', 
    'react-app/jest'
  ],
  rules: {
    // Disable unused vars warning for specific cases
    '@typescript-eslint/no-unused-vars': ['warn', { 
      'varsIgnorePattern': 'React|useState|useDispatch|addArgument|voteOnArgument|addReply|socketService|ArgumentsList|VisualDebateMap|NewArgumentForm|CollaborationIndicators|Argument',
      'argsIgnorePattern': '^_',
      'ignoreRestSiblings': true
    }],
    
    // Disable React Hook exhaustive deps rule
    'react-hooks/exhaustive-deps': 'warn'
  }
};