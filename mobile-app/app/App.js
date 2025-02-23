// App.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity 
} from 'react-native';
import { io } from 'socket.io-client';
import Constants from 'expo-constants';

// Replace with your server URL

const SOCKET_URL = 'http://192.168.251.147:3002';
export default function App() {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  
  const socket = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socket.current = io(SOCKET_URL);

    // Socket event listeners
    socket.current.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.current.on('userJoined', ({ user, users }) => {
      setConnectedUsers(users);
      setMessages(prev => [...prev, {
        id: Date.now(),
        system: true,
        text: `${user} joined the chat`
      }]);
    });

    socket.current.on('userLeft', ({ user, users }) => {
      setConnectedUsers(users);
      setMessages(prev => [...prev, {
        id: Date.now(),
        system: true,
        text: `${user} left the chat`
      }]);
    });

    socket.current.on('userTyping', ({ user, isTyping }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(user);
        } else {
          newSet.delete(user);
        }
        return newSet;
      });
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  const handleJoin = () => {
    if (username.trim()) {
      socket.current.emit('join', username);
      setIsJoined(true);
    }
  };

  const handleSend = () => {
    if (messageText.trim()) {
      socket.current.emit('message', { text: messageText });
      setMessageText('');
    }
  };

  const handleTyping = (text) => {
    setMessageText(text);
    
    // Emit typing status
    socket.current.emit('typing', true);
    
    // Clear previous timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    
    // Set new timeout
    typingTimeout.current = setTimeout(() => {
      socket.current.emit('typing', false);
    }, 1000);
  };

  if (!isJoined) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Join Chat</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your username"
          value={username}
          onChangeText={setUsername}
          onSubmitEditing={handleJoin}
        />
        <TouchableOpacity style={styles.button} onPress={handleJoin}>
          <Text style={styles.buttonText}>Join</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chat Room</Text>
        <Text style={styles.subtitle}>
          {connectedUsers.length} user(s) online
        </Text>
      </View>

      <FlatList
        style={styles.messageList}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[
            styles.messageContainer,
            item.system ? styles.systemMessage : 
            item.user === username ? styles.ownMessage : styles.otherMessage
          ]}>
            {!item.system && (
              <Text style={styles.messageUser}>
                {item.user === username ? 'You' : item.user}
              </Text>
            )}
            <Text style={styles.messageText}>{item.text}</Text>
            {!item.system && (
              <Text style={styles.messageTime}>
                {new Date(item.timestamp).toLocaleTimeString()}
              </Text>
            )}
          </View>
        )}
      />

      {typingUsers.size > 0 && (
        <Text style={styles.typingIndicator}>
          {Array.from(typingUsers).join(', ')} typing...
        </Text>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={handleTyping}
          multiline
        />
        <TouchableOpacity style={styles.button} onPress={handleSend}>
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Constants.statusBarHeight,
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  messageList: {
    flex: 1,
    padding: 15,
  },
  messageContainer: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  ownMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
  },
  systemMessage: {
    backgroundColor: '#F2F2F2',
    alignSelf: 'center',
  },
  messageUser: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
  },
  messageTime: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    fontSize: 12,
    color: '#666',
    padding: 5,
    paddingLeft: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 10,
    marginRight: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
