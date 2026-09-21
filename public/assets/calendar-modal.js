const viewTransitionName = "calendar-event"
const viewTransitionClass = "calendar-modal-view-transition"
const anchorName = "--calendar-event-anchor"

const findTrigger = (dialog) => document.querySelector(`[data-dialog-target="${dialog.id}"]`)

const cleanupTransition = (dialog, trigger, content) => {
  trigger.style.removeProperty("view-transition-name")
  content.style.removeProperty("view-transition-name")
  dialog.classList.remove(viewTransitionClass)
}

const setAnchor = (trigger) => {
  trigger.style.setProperty("anchor-name", anchorName)
}

const clearAnchor = (trigger) => {
  trigger.style.removeProperty("anchor-name")
}

const openDialog = (dialog, trigger) => {
  const content = dialog.querySelector(".calendar-modal-content")
  setAnchor(trigger)
  // Capture the event card as the old view, then move the name to the dialog content.
  trigger.style.viewTransitionName = viewTransitionName
  dialog.classList.add(viewTransitionClass)

  const transition = document.startViewTransition(() => {
    trigger.style.viewTransitionName = "none"
    // The shared name makes the browser interpolate position and size between the two.
    content.style.viewTransitionName = viewTransitionName
    dialog.showModal()
  })

  transition.finished.then(
    () => cleanupTransition(dialog, trigger, content),
    () => cleanupTransition(dialog, trigger, content),
  )
}

const closeDialog = (dialog) => {
  const trigger = findTrigger(dialog)
  const content = dialog.querySelector(".calendar-modal-content")
  setAnchor(trigger)
  // Capture the dialog content as the old view and return the name to the event card.
  content.style.viewTransitionName = viewTransitionName
  dialog.classList.add(viewTransitionClass)

  const transition = document.startViewTransition(() => {
    content.style.viewTransitionName = "none"
    trigger.style.setProperty("view-transition-name", viewTransitionName)
    dialog.close()
  })

  const finish = () => {
    cleanupTransition(dialog, trigger, content)
    clearAnchor(trigger)
    trigger.focus()
  }
  transition.finished.then(finish, finish)
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-dialog-target], [data-dialog-close]")
  if (target == null) {
    return
  }

  if (target.matches("[data-dialog-target]")) {
    event.preventDefault()
    openDialog(document.getElementById(target.dataset.dialogTarget), target)
    return
  }

  if (target.matches("[data-dialog-close]")) {
    event.preventDefault()
    closeDialog(target.closest("dialog"))
  }
})

for (const dialog of document.querySelectorAll("dialog.calendar-modal")) {
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault()
    closeDialog(dialog)
  })
}
