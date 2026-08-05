type ApiErrorLike = {
  data?: {
    data?: {
      code?: string
    }
  }
}

export default defineNuxtPlugin(() => {
  let handlingDisabledAccount = false
  const originalFetch = globalThis.$fetch

  globalThis.$fetch = originalFetch.create({
    async onResponseError({ response }) {
      const errorCode = (response._data as ApiErrorLike['data'] | undefined)?.data?.code

      if (errorCode === 'PASSWORD_CHANGE_REQUIRED') {
        await navigateTo('/change-password')
        return
      }

      if (errorCode === 'PASSWORD_RESET_REQUIRED_LOGIN' && !handlingDisabledAccount) {
        handlingDisabledAccount = true
        const auth = useAuthStore()
        const globalAlert = useGlobalAlertStore()

        auth.forceSignOut()
        void globalAlert
          .confirm({
            variant: 'warning',
            title: '비밀번호 초기화 안내',
            message:
              '비밀번호가 초기화되어 로그아웃되었습니다. 관리자에게 받은 임시 비밀번호로 다시 로그인해 주세요.',
            confirmLabel: '확인',
          })
          .finally(() => {
            handlingDisabledAccount = false
          })
        await navigateTo('/login')
        return
      }

      if (errorCode !== 'ACCOUNT_DISABLED' || handlingDisabledAccount) {
        return
      }

      handlingDisabledAccount = true
      const auth = useAuthStore()
      const globalAlert = useGlobalAlertStore()

      auth.forceSignOut()
      void globalAlert
        .confirm({
          variant: 'warning',
          title: '계정 이용 정지',
          message: '이용이 정지된 계정입니다. 관리자에게 문의해 주세요.',
          confirmLabel: '확인',
        })
        .finally(() => {
          handlingDisabledAccount = false
        })
      await navigateTo('/login')
    },
  })
})
