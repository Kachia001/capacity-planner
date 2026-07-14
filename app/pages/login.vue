<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

definePageMeta({
  middleware: 'guest-client',
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loginId = ref(null)
const password = ref(null)
const formError = ref<string | null>(null)

const submitLabel = computed(() => (auth.pending ? '로그인 중' : '로그인'))

async function submit() {
  formError.value = null

  if (!loginId.value || !password.value) {
    formError.value = '아이디와 비밀번호를 입력해주세요.'
    return
  }

  try {
    await auth.signIn(loginId.value, password.value)

    const defaultDestination = auth.isAdmin ? '/admin' : '/bay'
    await router.push(
      typeof route.query.redirect === 'string' ? route.query.redirect : defaultDestination,
    )
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '인증 요청에 실패했습니다.'
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-background px-6 py-10">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle>로그인</CardTitle>
        <CardDescription>
          Supabase Auth로 Capacity Planner 접근 권한을 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <label class="flex flex-col gap-2 text-sm font-medium">
            아이디
            <Input v-model="loginId" autocomplete="username" placeholder="admin" type="text" />
          </label>

          <label class="flex flex-col gap-2 text-sm font-medium">
            비밀번호
            <Input
              v-model="password"
              autocomplete="current-password"
              placeholder="6자 이상"
              type="password"
            />
          </label>

          <Alert v-if="formError || auth.errorMessage" variant="destructive">
            <AlertTitle>인증 실패</AlertTitle>
            <AlertDescription>{{ formError || auth.errorMessage }}</AlertDescription>
          </Alert>

          <Button type="submit" :disabled="auth.pending">
            {{ submitLabel }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
