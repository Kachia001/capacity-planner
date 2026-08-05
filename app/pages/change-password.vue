<script setup lang="ts">
import { KeyRound, ShieldCheck } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

definePageMeta({ middleware: 'auth-client' })
useHead({ title: '비밀번호 변경 · Capacity Planner' })

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const newPassword = ref('')
const passwordConfirmation = ref('')
const formError = ref<string | null>(null)

async function submit() {
  formError.value = null

  if (newPassword.value.length < 8) {
    formError.value = '새 비밀번호는 8자 이상이어야 합니다.'
    return
  }

  if (newPassword.value !== passwordConfirmation.value) {
    formError.value = '새 비밀번호 확인이 일치하지 않습니다.'
    return
  }

  try {
    await auth.changePassword(newPassword.value)
    const defaultDestination = auth.isSupervisor ? '/admin' : '/bay'
    await router.replace(
      typeof route.query.redirect === 'string' ? route.query.redirect : defaultDestination,
    )
  } catch {
    formError.value = auth.errorMessage || '비밀번호를 변경하지 못했습니다.'
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-background px-6 py-10">
    <Card class="w-full max-w-md">
      <CardHeader>
        <div
          class="mb-2 flex size-11 items-center justify-center rounded-full bg-amber-100 text-amber-700"
        >
          <KeyRound class="size-5" />
        </div>
        <CardTitle>새 비밀번호 설정</CardTitle>
        <CardDescription>
          임시 비밀번호로 로그인했습니다. 계속 이용하려면 새 비밀번호로 변경해야 합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <label class="flex flex-col gap-2 text-sm font-medium">
            새 비밀번호
            <Input
              v-model="newPassword"
              autocomplete="new-password"
              placeholder="8자 이상"
              type="password"
            />
          </label>

          <label class="flex flex-col gap-2 text-sm font-medium">
            새 비밀번호 확인
            <Input
              v-model="passwordConfirmation"
              autocomplete="new-password"
              placeholder="새 비밀번호 다시 입력"
              type="password"
            />
          </label>

          <Alert v-if="formError || auth.errorMessage" variant="destructive">
            <AlertTitle>변경 실패</AlertTitle>
            <AlertDescription>{{ formError || auth.errorMessage }}</AlertDescription>
          </Alert>

          <Alert>
            <ShieldCheck class="size-4" />
            <AlertTitle>변경 후 바로 이용할 수 있습니다.</AlertTitle>
            <AlertDescription>임시 비밀번호는 더 이상 사용할 수 없습니다.</AlertDescription>
          </Alert>

          <Button type="submit" size="lg" :disabled="auth.pending">
            {{ auth.pending ? '변경 중' : '비밀번호 변경' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
