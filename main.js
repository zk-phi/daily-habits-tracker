/* ---- constants */

const _properties = PropertiesService.getScriptProperties();

const END_OF_DATE_TIME = _properties.getProperty("END_OF_DATE_TIME") || 4;

const SLACK_WEBHOOK_URL = (
  _properties.getProperty("SLACK_WEBHOOK_URL") || throw "webhook url not set"
);

const SLACK_ACCESS_TOKEN = (
  _properties.getProperty("SLACK_ACCESS_TOKEN") || throw "access token not set"
);

const TODAY = new Date();
TODAY.setHours(END_OF_DATE_TIME);
TODAY.setMinutes(0);
TODAY.setSeconds(0);
TODAY.setMilliseconds(0);

const SHEET = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

/* ---- logic */

const addHabit = (name) => {
  SHEET.appendRow([name, 0, 0]);
};

const renameHabit = (ix, newName) => {
  SHEET.getRange(ix + 1, 1).setValue(newName);
};

const deleteHabit = (ix) => {
  SHEET.deleteRow(ix + 1);
};

const markHabitAsDone = (ix) => {
  const habits = SHEET.getRange(ix + 1, 1, 1, 3).getValues()[0];
  if (new Date(habits[2]) < TODAY) {
    habits[1] += 1;
    habits[2] = TODAY;
    SHEET.getRange(ix + 1, 1, 1, 3).setValues([habits]);
  }
};

const getHabits = () => {
  const habits = SHEET.getDataRange().getValues();
  return habits.map((row) => ({
    name: row[0],
    streak: row[1],
    done: new Date(row[2]) >= TODAY
  }));
};

/* ---- slack */

const postToSlack = (text, blocks) => {
  return UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: text || "", blocks: blocks || [] })
  });
};

const openSlackModal = (trigger_id, view, push) => {
  return UrlFetchApp.fetch('https://slack.com/api/views.' + (push ? 'push' : 'open'), {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + SLACK_ACCESS_TOKEN },
    payload: JSON.stringify({ trigger_id: trigger_id, view: view })
  });
};

/* ---- utils */

const habitToSlackBlock = (habit, ix) => {
  const block = {
    type: "section",
    text: { type: "mrkdwn", text: `- ${habit.name} ${habit.done ? ":check:" : ""}` },
  };

  if (!habit.done) {
    block.accessory = {
      type: "button",
      text: { type: "plain_text", text: ":check:", emoji: true },
      action_id: "mark_habit",
      value: ix,
    }
  }

  return block;
};

/* ---- interface */

const doTimer = () => {
  const habits = getHabits();
  if (habits.some(habit => !habit.done)) {
    postToSlack("", [
      { type: "section", text: { type: "mrkdwn", text: "Today's habit statuses" } }
    ].concat(
      getHabits().map(habitToSlackBlock)
    ));
  }
};

function test () {
  SHEET.clear();
  addHabit("hoge");
  addHabit("fuga");
  addHabit("piyo");
  renameHabit(1, "dosukoi");
  deleteHabit(0);
  markHabitAsDone(0);
  markHabitAsDone(1);
  Logger.log(getHabits());
}
