import React, { useEffect, useState } from "react";
import { Button, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { FlatList, GestureHandlerRootView } from "react-native-gesture-handler";

import { addTodos, getAllTodos, getDBVersion, getSQLiteVersion, migrateDB, updateTodoStatus } from "@/lib/db";
import { TodoItem, uuid } from "@/lib/types";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";


function ListItem({ todoItem, toggleTodo }: { todoItem: TodoItem; toggleTodo: (id: uuid) => void }) {

  const handlePress = (id: uuid) => {
    console.log(`Todo item with id ${id} marked as complete.`);
    toggleTodo(id);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      {!todoItem.status ? (
        <>
          <Text style={styles.item}>{todoItem.text}</Text>
          <Button title="Concluir" onPress={() => { handlePress(todoItem.id) }} color="green" />
        </>
      ) : (
        <Text style={styles.itemdone}>{todoItem.text}</Text>
      )}
    </View>
  );
}

enum FilterOptions {
  All = "all",
  Pending = "pending",
  Done = "done"
}

function TodosFilter({ selectedValue, setFilter }: { selectedValue: FilterOptions, setFilter: (value: FilterOptions) => void }) {
  return (
    <View style={filterStyles.filterMenu}>
      <TouchableOpacity
        style={[filterStyles.button, filterStyles.buttonAll, selectedValue === FilterOptions.All && filterStyles.buttonAllSelected]}
        onPress={() => setFilter(FilterOptions.All)}
      >
        <Text style={[filterStyles.label, filterStyles.buttonAllLabel, selectedValue === FilterOptions.All && filterStyles.buttonAllSelectedLabel]}>Todos</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[filterStyles.button, filterStyles.buttonPending, selectedValue === FilterOptions.Pending && filterStyles.buttonPendingSelected]}
        onPress={() => setFilter(FilterOptions.Pending)}
      >
        <Text style={[filterStyles.label, filterStyles.buttonPendingLabel, selectedValue === FilterOptions.Pending && filterStyles.buttonPendingSelectedLabel]}>Pendentes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[filterStyles.button, filterStyles.buttonDone, selectedValue === FilterOptions.Done && filterStyles.buttonDoneSelected]}
        onPress={() => setFilter(FilterOptions.Done)}
      >
        <Text style={[filterStyles.label, filterStyles.buttonDoneLabel, selectedValue === FilterOptions.Done && filterStyles.buttonDoneSelectedLabel]}>Concluídos</Text>
      </TouchableOpacity>
    </View>
  );
}

function AddTodoForm({ addTodoHandler }: { addTodoHandler: (text: string) => void }) {
  const [text, setText] = React.useState("");

  const handlePress = () => {
    if (text.trim().length === 0) return;

    addTodoHandler(text);
    setText("");
    Keyboard.dismiss();
  };

  return (
    <View style={{ width: "100%", marginTop: 10, paddingHorizontal: 20, alignItems: "center" }}>
      <TextInput
        value={text}
        onChangeText={setText}
        style={styles.textInput}
        placeholder="O que você precisa fazer?"
        placeholderTextColor="#000"
        onSubmitEditing={handlePress}
        returnKeyType="done"
      />
    </View>
  );
}

function Footer() {
  const db = useSQLiteContext();

  const [sqliteVersion, setSqliteVersion] = useState<string>("");
  const [dbVersion, setDBVersion] = useState<string>();

  useEffect( () => {
    async function setup(){
      const sqliteVersionResult = await getSQLiteVersion(db);
      if (sqliteVersionResult) {
        setSqliteVersion(sqliteVersionResult['sqlite_version()']);
      }
      else {
        setSqliteVersion('unknown');
      }

      const dbVersionResult = await getDBVersion(db);
      
      if (dbVersionResult) {
        setDBVersion(dbVersionResult['user_version'].toString());
      }
      else {
        setDBVersion('unknown');
      }



    }

    setup();
  }, [db]);

  return (
    <View>
      <Text style={{padding: 20}}>SQLite version: {sqliteVersion} / DBVersion: {dbVersion}</Text>
    </View>
  );
}

function TodoList() {
  
  const [todos, setTodos] = React.useState<TodoItem[]>([]);

  const db = useSQLiteContext();
  
  useEffect(() => {
    async function load() {
      const result = await getAllTodos(db);
      setTodos(result);
    }
    
    load();

  }, [db])

const refresh = async () => {
    const result = await getAllTodos(db);
    setTodos(result);
}

  const [filter, setFilter] = React.useState<FilterOptions>(FilterOptions.All);

  const addTodo = async (text: string) => {
    await addTodos(db, text);
    await refresh();
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      const nextStatus = todo.status === "Pendente" ? "Concluido" : "Pendente";
      await updateTodoStatus(db, id, nextStatus);
      await refresh();
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <Text style={{ fontSize: 32, fontWeight: "bold", marginTop: 20 }}>
        TODO List
      </Text>
      <AddTodoForm addTodoHandler={addTodo} />
      <TodosFilter selectedValue={filter} setFilter={setFilter} />
      <FlatList
        style={styles.list}
        data={todos.filter(todo => {
          switch (filter) {
            case FilterOptions.All:
              return true;
            case FilterOptions.Pending:
              return !todo.status;
            case FilterOptions.Done:
              return todo.status;
            default:
              return true;
          }
        }).sort((a, b) => {
          const aDate = new Date(a.createdAt);
          const bDate = new Date(b.createdAt);
          return bDate.getTime() - aDate.getTime();;
        })}
        renderItem={({ item }) => (
          <ListItem todoItem={item} toggleTodo={toggleTodo} />
        )}
      />
    </GestureHandlerRootView>
  );
}


export default function Index() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <SQLiteProvider databaseName="todos.db" onInit={migrateDB}>
          <TodoList />
          <Footer />
        </SQLiteProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: "center",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  textInput: {
    width: "100%",
    borderColor: "black",
    borderWidth: 1,
    margin: 10,
    padding: 10,
    borderRadius: 50,
  },
  item: {
    padding: 10,
    fontSize: 18,
    height: 44,
  },
  itemdone: {
    padding: 10,
    fontSize: 18,
    height: 44,
    textDecorationLine: "line-through",
  },
  list: {
    width: "100%",
    backgroundColor: "white",
    padding: 10,
    marginTop: 20,
  },
});

const filterStyles = StyleSheet.create({
  filterMenu: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 10
  },

  button: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 50,
    alignSelf: 'flex-start',
    marginHorizontal: '1%',
    marginBottom: 6,
    minWidth: '28%',
    textAlign: 'center',
  },

  label: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  buttonAll: {
    backgroundColor: 'lightgreen',
  },
  buttonAllSelected: {
    backgroundColor: 'darkgreen',
  },

  buttonAllLabel: {
    color: 'darkgreen',
  },

  buttonAllSelectedLabel: {
    color: 'lightgreen',
  },

  buttonPending: {
    backgroundColor: 'oldlace',
  },
  buttonPendingSelected: {
    backgroundColor: 'coral',
  },

  buttonPendingLabel: {
    color: 'coral',
  },
  buttonPendingSelectedLabel: {
    color: 'oldlace',
  },

  buttonDone: {
    backgroundColor: 'lightblue',
  },
  buttonDoneSelected: {
    backgroundColor: 'royalblue',
  },
  buttonDoneLabel: {
    color: 'royalblue',
  },
  buttonDoneSelectedLabel: {
    color: 'lightblue',
  },

  selectedLabel: {
    color: 'white',
  },
});

