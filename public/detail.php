<?php
    $username = $_POST['username']
    $password = $_POST['password']

$conn = new mysqli('localhost','root','test');
    if($conn->connect_error){
        die('Connection Failed : ' $conn->connect_error);
    }else{
        $stmt = $conn->prepare("insert into userinputdata(username, password) values(?, ?)");
		$stmt->bind_param("ss", $username, $password);
		$execval = $stmt->execute();
		echo $execval;
		echo "Registration successfully...";
		$stmt->close();
		$conn->close();
	}
?>