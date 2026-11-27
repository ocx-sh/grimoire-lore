<template>
  <input type="password" autocomplete="username" />
  <Password v-model="pw" />
  <input type="password" :autocomplete="mode" />
</template>
