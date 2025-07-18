<template>
  <a-form
    :model="formState"
    name="database-config"
    @finish="onFinish"
    @finishFailed="onFinishFailed"
  >
    <a-form-item
      label="Host"
      name="host"
      :rules="[{ required: true, message: 'Please input the database host!' }]"
    >
      <a-input v-model:value="formState.host" />
    </a-form-item>

    <a-form-item
      label="Port"
      name="port"
      :rules="[{ required: true, message: 'Please input the database port!' }]"
    >
      <a-input-number v-model:value="formState.port" :min="1" :max="65535" />
    </a-form-item>

    <a-form-item
      label="Username"
      name="username"
      :rules="[{ required: true, message: 'Please input the database username!' }]"
    >
      <a-input v-model:value="formState.username" />
    </a-form-item>

    <a-form-item
      label="Password"
      name="password"
      :rules="[{ required: true, message: 'Please input the database password!' }]"
    >
      <a-input-password v-model:value="formState.password" />
    </a-form-item>

    <a-form-item
      label="Database Name"
      name="databaseName"
      :rules="[{ required: true, message: 'Please input the database name!' }]"
    >
      <a-input v-model:value="formState.databaseName" />
    </a-form-item>

    <a-form-item>
      <a-button type="primary" html-type="submit">Submit</a-button>
    </a-form-item>
  </a-form>
</template>

<script setup>
import { reactive } from 'vue';

const formState = reactive({
  host: '',
  port: 3306,
  username: '',
  password: '',
  databaseName: ''
});

const onFinish = values => {
  console.log('Success:', values);
};

const onFinishFailed = errorInfo => {
  console.log('Failed:', errorInfo);
};
</script>

<style scoped></style>