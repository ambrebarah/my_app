"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
var react_1 = __importDefault(require("react"));
var native_1 = require("@react-navigation/native");
var stack_1 = require("@react-navigation/stack");
var HomeScreen_1 = __importDefault(require("./screens/HomeScreen"));
var ContactSelectScreen_1 = __importDefault(require("./screens/ContactSelectScreen"));
var Stack = (0, stack_1.createStackNavigator)();
function App() {
    return (<native_1.NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen_1.default} options={{ title: 'SafeShe' }}/>
        <Stack.Screen name="SelectContact" component={ContactSelectScreen_1.default} options={{ title: 'Select Contact' }}/>
      </Stack.Navigator>
    </native_1.NavigationContainer>);
}
