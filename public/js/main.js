const socket = io();
socket.on('init', (data) => {
  console.log(data);
});

socket.on('updated_r', (data) => {
  // alert("gets")
  see_messages(data.r, user)
  hide_unselected_discussions();
  my_add_edit_hide_delete();
  their_add_edit_hide_delete();
  user_page_and_banning();
  document.getElementById("scroll_bottom").click()

  r = data.r;
});
console.log("done");
function send_socket_msg ()
{
  text = document.getElementById("text");
  discussion_dropdown = document.getElementById("discussion_dropdown");

  // alert(text.value.replace(/\n/g, "_system_enter_"));

  socket.emit("msg", { discussion_id: discussion_dropdown.value, text: text.value.replace(/\n/g, "_system_enter_"), r: r, user: user });
}

function notif_users ()
{
  discussion_dropdown = document.getElementById("discussion_dropdown");

  // alert(discussion_dropdown.value)

  socket.emit("msg", { discussion_id: discussion_dropdown.value, text: "((INVISIBLE_MESSAGE_TO_UPDATE_SENT_FILE))", r: r, user: user });
}

// function get_updated_json ()
// {
//   socket.emit("get_updated_json");
// }

// socket.on('get_updated_json_response', (r_data) => {
//   // alert("gets")
//   see_messages(r_data.r, user)
//   hide_unselected_discussions();
//   add_edit_hide_delete();
//   // document.getElementById("scroll_bottom").click()

//   r = r_data.r;
// });

// function get_updated_user ()
// {
//   socket.emit("get_updated_user", {user_id: user_id});
// }

// socket.on('get_updated_user_response', (user_data) => {
//   // alert("gets")
//   see_messages(r, user_data.user)
//   hide_unselected_discussions();
//   add_edit_hide_delete();
//   // document.getElementById("scroll_bottom").click()

//   user = user_data.user;
// });


