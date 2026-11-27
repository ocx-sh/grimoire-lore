<template>
  <form @submit.prevent="login">
    <h1>Sign in</h1>
    <div class="row">
      <!-- a placeholder is not a name -->
      <VInput
        v-model="email"
        placeholder="Email" />
      <input
        type="text"
        placeholder="Search" />
      <p>Plain text.</p>
      <SensitiveInput placeholder="Token" />
    </div>
  </form>
</template>
